import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, User, Clock, X, CheckCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { User as UserType } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { useRef } from 'react';

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
  const [showMessageView, setShowMessageView] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [shops, setShops] = useState<{id: string, name: string}[]>([]);

  const [newMessage, setNewMessage] = useState({
    recipient: '',
    recipientId: '',
    subject: '',
    content: ''
  });

  // Récupérer les utilisateurs disponibles
  const fetchAvailableUsers = async () => {
    if (!currentUser || !currentUser.id) {
      console.log('currentUser non disponible pour fetchAvailableUsers:', currentUser);
      return;
    }
    
    try {
      setLoadingUsers(true);
      console.log('Récupération des utilisateurs pour:', currentUser.id, currentUser.role);
      
      // Récupération directe depuis Firestore
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('Utilisateurs récupérés:', users.length);
      // Filtrer l'utilisateur actuel de la liste
      const filteredUsers = users.filter(u => u.id !== currentUser.id);
      console.log('Utilisateurs filtrés:', filteredUsers.length);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Erreur détaillée lors de la récupération des utilisateurs:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Charger la liste des shops si admin
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      const fetchShops = async () => {
        const snap = await getDocs(collection(db, 'shops'));
        setShops(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      };
      fetchShops();
    }
  }, [currentUser]);

  // Récupérer les messages
  const fetchMessages = async () => {
    if (!currentUser || !currentUser.id) {
      console.log('currentUser non disponible:', currentUser);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Récupération des messages pour:', currentUser.id, currentUser.role);
      
      let userMessages: Message[];

      if (currentUser.role === 'admin') {
        console.log('Utilisation de getAllForAdmin pour admin global');
        // Admin global voit tous les messages
        const messagesSnapshot = await getDocs(collection(db, 'messages'));
        userMessages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      } else {
        console.log('Utilisation de getByUserWithAdminMessages pour utilisateur normal');
        // Utilisateur normal ou admin de shop - récupérer ses messages
        const messagesSnapshot = await getDocs(collection(db, 'messages'));
        const allMessages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        
        // Filtrer les messages de l'utilisateur et les messages admin
        userMessages = allMessages.filter(msg => 
          msg.senderId === currentUser.id || 
          msg.recipientId === currentUser.id ||
          msg.recipientId === 'ALL_USERS' ||
          (msg.recipientId === 'SHOP_USERS' && msg.shopId === currentUser.shopId)
        );
      }

      console.log('Messages récupérés:', userMessages.length);
      setMessages(userMessages);
    } catch (error) {
      console.error('Erreur détaillée lors de la récupération des messages:', error);
      setErrorMessage(`Erreur lors de la récupération des messages: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Charger les messages au montage
  useEffect(() => {
    if (currentUser && currentUser.id) {
      console.log('currentUser chargé, lancement des récupérations:', currentUser.id);
      fetchMessages();
      fetchAvailableUsers();
    } else {
      console.log('currentUser pas encore chargé ou incomplet:', currentUser);
    }
  }, [currentUser]);

  // Marquer un message comme lu et afficher la vue de lecture
  const handleMessageClick = async (message: Message) => {
    if (message.status === 'non-lu') {
      try {
        // Mise à jour directe dans Firestore
        await updateDoc(doc(db, 'messages', message.id), { status: 'lu' });
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
    setShowMessageView(true);
    setShowCompose(false);
    setReplyMode(false);
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

      if (currentUser.role === 'admin') {
        // Admin global envoie à tous les utilisateurs ou à un utilisateur spécifique ou à un shop précis
        if (newMessage.recipient === 'all') {
          recipientId = 'ALL_USERS';
          recipientName = 'Tous les utilisateurs';
        } else if (newMessage.recipient.startsWith('shop:')) {
          const shopId = newMessage.recipient.replace('shop:', '');
          const shop = shops.find(s => s.id === shopId);
          recipientId = `SHOP_USERS_${shopId}`;
          recipientName = shop ? `Utilisateurs du shop ${shop.name}` : 'Utilisateurs du shop';
        } else {
          // Envoi à un utilisateur spécifique
          const selectedUser = availableUsers.find(u => u.id === newMessage.recipientId);
          recipientId = newMessage.recipientId;
          recipientName = selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : newMessage.recipient;
        }
      } else {
        // Utilisateur normal envoie uniquement à l'admin
        if (newMessage.recipient === 'admin') {
          // Trouver l'admin du shop de l'utilisateur
          const shopAdmin = availableUsers.find(u => 
            u.role === 'admin' && u.shopId === currentUser.shopId
          );
          
          if (shopAdmin) {
            // Envoyer directement à l'admin du shop
            recipientId = shopAdmin.id;
            recipientName = `${shopAdmin.prenom} ${shopAdmin.nom}`;
          } else {
            // Fallback: envoyer à "ADMIN" général
            recipientId = 'ADMIN';
            recipientName = 'Administrateur';
          }
        } else if (newMessage.recipient === 'globalAdmin') {
          // Trouver l'utilisateur avec le rôle globalAdmin
          const globalAdmin = availableUsers.find(u => u.role === 'globalAdmin');
          if (globalAdmin) {
            recipientId = globalAdmin.id;
            recipientName = `${globalAdmin.prenom} ${globalAdmin.nom}`;
          } else {
            recipientId = 'GLOBAL_ADMIN';
            recipientName = 'Administrateur global';
          }
        }
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
      await addDoc(collection(db, 'messages'), messageData);

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
        setShowMessageView(false);
        setReplyMode(false);
      } else {
        // Sur desktop, si c'était une réponse, revenir à la vue de lecture
        if (replyMode) {
          setShowCompose(false);
          setReplyMode(false);
        }
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

  // Supprimer un message
  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }
    try {
      // Suppression directe dans Firestore
      await deleteDoc(doc(db, 'messages', id));
      setMessages(messages.filter(m => m.id !== id));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setErrorMessage('Erreur lors de la suppression du message');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
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

  // Répondre à un message
  const handleReply = (message: Message) => {
    setReplyMode(true);
    setShowCompose(true);
    setShowMessageView(false);
    
    // Pré-remplir le formulaire avec les informations du destinataire
    setNewMessage({
      recipient: 'specific',
      recipientId: message.senderId,
      subject: `Re: ${message.subject}`,
      content: ''
    });
  };

  // Gérer la fermeture du modal
  const handleClose = () => {
    setShowCompose(false);
    setShowMessageView(false);
    setSelectedMessage(null);
    setReplyMode(false);
    setShowSuccess(false);
    setShowError(false);
    onClose();
  };

  // DEBUG : Afficher le rôle et la liste des shops lors de l'ouverture du formulaire de nouveau message
  useEffect(() => {
    if (showCompose) {
      console.log('DEBUG - currentUser:', currentUser);
      console.log('DEBUG - shops chargés:', shops);
    }
  }, [showCompose, currentUser, shops]);

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
            <h2 className="text-lg font-semibold text-gray-900">
              {showMessageView ? 'Message' : showCompose ? (replyMode ? 'Répondre' : 'Nouveau Message') : 'Messages'}
            </h2>
            <div className="flex items-center space-x-2">
              {showMessageView && selectedMessage && (
                <button
                  onClick={() => handleReply(selectedMessage)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Répondre
                </button>
              )}
              {!showCompose && !showMessageView && (
                <button
                  onClick={() => setShowCompose(!showCompose)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Nouveau
                </button>
              )}
              {(showCompose || showMessageView) && (
                <button
                  onClick={() => {
                    setShowCompose(false);
                    setShowMessageView(false);
                    setReplyMode(false);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                >
                  Retour
                </button>
              )}
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
                    onClick={() => {
                      setShowCompose(true);
                      setShowMessageView(false);
                      setReplyMode(false);
                      setNewMessage({
                        recipient: '',
                        recipientId: '',
                        subject: '',
                        content: ''
                      });
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Nouveau Message
                  </button>
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
                      {/* Icône supprimer pour les messages envoyés par l'utilisateur */}
                      {message.senderId === currentUser.id && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteMessage(message.id); }}
                          className="ml-auto p-1 text-red-500 hover:text-red-700"
                          title="Supprimer le message"
                        >
                          <Trash2 size={16} />
                        </button>
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

          {/* Message Content, Compose, or Message View */}
          <div className={`${!showCompose && !showMessageView ? 'hidden' : 'block'} lg:block flex-1 flex flex-col`}>
            {/* Header desktop */}
            <div className="hidden lg:block p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {showCompose ? (replyMode ? 'Répondre au Message' : 'Nouveau Message') : 'Lecture du Message'}
                </h3>
                <div className="flex items-center space-x-2">
                  {showMessageView && selectedMessage && (
                    <button
                      onClick={() => handleReply(selectedMessage)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Répondre
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowCompose(false);
                      setShowMessageView(false);
                      setReplyMode(false);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
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

              {/* Vue de lecture de message */}
              {showMessageView && selectedMessage && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-gray-500" />
                        <span className="font-medium text-gray-900">{selectedMessage.sender}</span>
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(selectedMessage.date)}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">{selectedMessage.subject}</h2>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>
                  </div>
                  
                  {/* Bouton Répondre pour mobile */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => handleReply(selectedMessage)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Send size={18} />
                      <span>Répondre</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Formulaire de composition/réponse */}
              {showCompose && (
                <form onSubmit={handleSendMessage} className="bg-white rounded-lg shadow p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destinataire
                    </label>
                    {currentUser.role === 'admin' ? (
                      <div className="space-y-2">
                        <select
                          value={newMessage.recipient}
                          onChange={e => setNewMessage({ ...newMessage, recipient: e.target.value, recipientId: '' })}
                          className="w-full border rounded px-3 py-2"
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="all">Tous les utilisateurs</option>
                          {/* Suppression de l'option par shop */}
                          <option disabled>────────────</option>
                          {availableUsers.map(u => (
                            u.nom && u.nom.trim() !== 'Bithsila' && (
                              <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
                            )
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={newMessage.recipient}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewMessage({
                              ...newMessage, 
                              recipient: value,
                              recipientId: value === 'specific' ? '' : value
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">Sélectionner un destinataire</option>
                          <option value="globalAdmin">Administrateur global</option>
                        </select>
                      </div>
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
                        <span>{replyMode ? 'Envoyer la Réponse' : 'Envoyer le Message'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};