import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, User, Clock, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { User as UserType } from '../../types';
import { messageService, isGlobalAdmin } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

interface MessagingPageProps {
  user: UserType;
  onClose: () => void;
  onMessageRead?: () => void;
}

interface Message {
  id: string;
  sender: string;
  senderId: string;
  recipient: string;
  recipientId: string;
  subject: string;
  content: string;
  status: 'lu' | 'non-lu';
  date: string;
  shopId: string;
  shopName: string;
}

export const MessagingPage: React.FC<MessagingPageProps> = ({ user, onClose, onMessageRead }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const [newMessage, setNewMessage] = useState({
    recipient: '',
    recipientId: '',
    subject: '',
    content: ''
  });

  // Récupérer les messages
  const fetchMessages = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let userMessages: Message[];

      if (isGlobalAdmin(currentUser)) {
        // Admin global voit tous les messages
        userMessages = await messageService.getAllForAdmin(currentUser);
      } else {
        // Utilisateur normal voit ses messages
        userMessages = await messageService.getByUser(currentUser.id);
      }

      setMessages(userMessages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      setErrorMessage('Erreur lors de la récupération des messages');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Charger les messages au montage
  useEffect(() => {
    if (currentUser) {
      fetchMessages();
    }
  }, [currentUser]);

  // Marquer un message comme lu
  const handleMessageClick = async (message: Message) => {
    if (message.status === 'non-lu') {
      try {
        await messageService.markAsRead(message.id);
        // Mettre à jour localement
        setMessages(messages.map(m => 
          m.id === message.id ? { ...m, status: 'lu' as const } : m
        ));
        
        // Notifier le parent pour mettre à jour les notifications
        if (onMessageRead) {
          onMessageRead();
        }
      } catch (error) {
        console.error('Erreur lors du marquage comme lu:', error);
      }
    }
    setSelectedMessage(message);
  };

  // Envoyer un message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setErrorMessage('Vous devez être connecté pour envoyer un message');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      // Déterminer le destinataire
      let recipientId = '';
      let recipientName = '';

      if (isGlobalAdmin(currentUser)) {
        // Admin global envoie à tous les utilisateurs ou à un shop spécifique
        if (newMessage.recipient === 'all') {
          recipientId = 'ALL_USERS';
          recipientName = 'Tous les utilisateurs';
        } else {
          recipientId = newMessage.recipientId;
          recipientName = newMessage.recipient;
        }
      } else {
        // Utilisateur normal envoie à l'admin
        recipientId = 'ADMIN';
        recipientName = 'Administrateur';
      }

      const messageData = {
        sender: `${currentUser.prenom} ${currentUser.nom}`,
        senderId: currentUser.id,
        recipient: recipientName,
        recipientId: recipientId,
        subject: newMessage.subject,
        content: newMessage.content,
        status: 'non-lu' as const,
        date: new Date().toISOString(),
        shopId: currentUser.shopId,
        shopName: currentUser.shopName
      };

      // Sauvegarder dans Firebase
      await messageService.create(messageData);

      // Succès
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Réinitialiser le formulaire
      setNewMessage({
        recipient: '',
        recipientId: '',
        subject: '',
        content: ''
      });

      // Recharger les messages
      fetchMessages();

      // Sur mobile, revenir à la liste des messages
      if (window.innerWidth < 1024) {
        setShowCompose(false);
      }

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      setErrorMessage(error.message || 'Erreur lors de l\'envoi du message');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Gérer la fermeture du modal
  const handleClose = () => {
    setShowCompose(false);
    setSelectedMessage(null);
    setShowSuccess(false);
    setShowError(false);
    onClose();
  };

  // Si currentUser n'est pas encore chargé, afficher un loader
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header mobile */}
        <div className="lg:hidden p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCompose(!showCompose)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                {showCompose ? 'Liste' : 'Nouveau'}
              </button>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Messages List */}
          <div className={`${showCompose ? 'hidden' : 'block'} lg:block lg:w-1/3 border-r border-gray-200 flex-1 lg:flex-none`}>
            {/* Header desktop */}
            <div className="hidden lg:block p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchMessages}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700"
                    title="Actualiser"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto h-full max-h-[60vh] lg:max-h-none">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Chargement des messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageCircle size={48} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Aucun message</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      message.status === 'non-lu' ? 'bg-blue-50' : ''
                    } ${selectedMessage?.id === message.id ? 'bg-blue-100' : ''}`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <User size={14} className="text-gray-500 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium text-gray-900">
                        {message.sender}
                      </span>
                      {message.status === 'non-lu' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1">
                      {message.subject}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {message.content}
                    </p>
                    <div className="flex items-center space-x-1 mt-2">
                      <Clock size={10} className="text-gray-400 sm:w-3 sm:h-3" />
                      <span className="text-xs text-gray-400">{formatDate(message.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Content or Compose */}
          <div className={`${!showCompose ? 'hidden' : 'block'} lg:block flex-1 flex flex-col`}>
            {/* Header desktop */}
            <div className="hidden lg:block p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nouveau Message</h3>
            </div>
            
            <div className="flex-1 p-3 sm:p-4">
              {/* Messages de succès et d'erreur */}
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <CheckCircle size={16} className="text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Message envoyé avec succès !</p>
                  </div>
                </div>
              )}

              {showError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertCircle size={16} className="text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinataire
                  </label>
                  {isGlobalAdmin(currentUser) ? (
                    <select
                      value={newMessage.recipient}
                      onChange={(e) => setNewMessage({...newMessage, recipient: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Sélectionner un destinataire</option>
                      <option value="all">Tous les utilisateurs</option>
                      <option value="shop">Utilisateurs de mon shop</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value="Administrateur"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sujet
                  </label>
                  <input
                    type="text"
                    required
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Sujet du message"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Décrivez votre problème ou question..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} className="sm:w-5 sm:h-5" />
                      <span>Envoyer le Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};