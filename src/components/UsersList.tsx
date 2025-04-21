import React from 'react';
import { User } from '../types';
import { BrainCircuit } from 'lucide-react';

interface UsersListProps {
  users: User[];
  currentUser: User;
}

const UsersList: React.FC<UsersListProps> = ({ users, currentUser }) => {
  return (
    <div className="overflow-y-auto h-full pb-4">
      <div className="p-4 border-b border-gray-100 bg-purple-50">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">HiveMind AI</p>
            <p className="text-xs text-purple-600">Always active</p>
          </div>
        </div>
      </div>
      
      <ul className="divide-y divide-gray-100">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUser.id;
          
          return (
            <li key={user.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-center space-x-3">
                <div 
                  className="flex-shrink-0 h-10 w-10 rounded-full border-2 flex items-center justify-center" 
                  style={{ borderColor: user.color }}
                >
                  <span className="text-sm font-medium" style={{ color: user.color }}>
                    {(user.name || "").substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.name} {isCurrentUser && <span className="text-xs text-gray-500">(you)</span>}
                  </p>
                  <p className="text-xs text-green-600">Online</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UsersList;
