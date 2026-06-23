import React, { useState, useEffect } from 'react';
import { Message, User } from '../types';
import { Button } from './ui/Button';
import { MessageSquare, Send, X, Reply, Plus } from 'lucide-react';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';

interface MessagePanelProps {
  messages: Message[];
  currentUser: User;
  onMessageRead: () => void;
}

export function MessagePanel({ messages, currentUser, onMessageRead }: MessagePanelProps) {
  const navigate = useNavigate();
  const [isComposing, setIsComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [availableRecipients, setAvailableRecipients] = useState<User[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  useEffect(() => {
    const loadUsers = async () => {
      const allUsers = await db.getUsers();
      const map: Record<string, User> = {};
      allUsers.forEach(u => map[u.id] = u);
      setUsersMap(map);

      let recipients: User[] = [];
      if (currentUser.role === 'developer') {
        recipients = allUsers.filter(u => u.role === 'coordinator');
      } else if (currentUser.role === 'coordinator') {
        recipients = allUsers.filter(u => u.role === 'developer' || u.role === 'teacher');
      } else if (currentUser.role === 'teacher') {
        recipients = allUsers.filter(u => u.role === 'coordinator');
      }
      setAvailableRecipients(recipients);
    };
    loadUsers();
  }, [currentUser]);

  const handleMarkAsRead = async (msgId: string) => {
    await db.markMessageAsRead(msgId);
    onMessageRead();
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setSelectedRecipient(msg.senderId);
    setIsComposing(true);
  };

  const handleNewMessage = () => {
    setReplyTo(null);
    setSelectedRecipient('');
    setMessageContent('');
    setIsComposing(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !messageContent.trim()) return;

    await db.addMessage({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      senderId: currentUser.id,
      receiverId: selectedRecipient,
      content: messageContent,
      timestamp: new Date().toISOString(),
      read: false,
    });

    setIsComposing(false);
    setMessageContent('');
    setReplyTo(null);
    alert('Mensagem enviada com sucesso!');
  };

  const getSenderName = (senderId: string) => {
    const sender = usersMap[senderId];
    return sender ? sender.name : 'Usuário Desconhecido';
  };

  return (
    <div id="messages-section" className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
          <MessageSquare className="w-6 h-6" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Mensagens</h2>
        </div>
        {!isComposing && (
          <Button size="sm" onClick={handleNewMessage} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all duration-200 hover:shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Nova Mensagem
          </Button>
        )}
      </div>

      {isComposing ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-slate-900 dark:text-white">
              {replyTo ? 'Responder Mensagem' : 'Nova Mensagem'}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setIsComposing(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <form onSubmit={handleSendMessage} className="space-y-4">
            {replyTo && (
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 mb-4">
                <span className="font-semibold block mb-1">Em resposta a {getSenderName(replyTo.senderId)}:</span>
                <p className="italic">"{replyTo.content}"</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Para:</label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                required
                disabled={!!replyTo}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="">Selecione um destinatário...</option>
                {availableRecipients.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === 'coordinator' ? 'Coordenador' : user.role === 'teacher' ? 'Professor' : 'Desenvolvedor'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensagem:</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                required
                rows={4}
                className="w-full p-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"
                placeholder="Digite sua mensagem aqui..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all duration-200 hover:shadow-md">
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {messages.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Nenhuma mensagem recebida.</p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`p-4 rounded-xl border ${msg.read ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800' : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      De: {getSenderName(msg.senderId)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(msg.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    <Button size="sm" variant="outline" onClick={() => handleReply(msg)} className="h-8 text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Reply className="w-3.5 h-3.5 mr-1.5" />
                      Responder
                    </Button>
                    {!msg.read && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(msg.id)} className="h-8 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </div>
                <p className={`text-sm mt-2 break-words whitespace-pre-wrap ${msg.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
                  {msg.content}
                </p>
                {msg.link && msg.linkText && (
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(msg.link!)}
                      className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/30"
                    >
                      {msg.linkText}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
