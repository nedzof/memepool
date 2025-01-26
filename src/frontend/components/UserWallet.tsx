import React, { useState, useEffect } from 'react';
import { MemeVideoMetadata } from '../../shared/types/metadata';

interface UserWalletProps {
  userId: string;
}

const UserWallet: React.FC<UserWalletProps> = ({ userId }) => {
  const [userMemes, setUserMemes] = useState<MemeVideoMetadata[]>([]);

  useEffect(() => {
    const fetchUserMemes = async () => {
      try {
        // TODO: Fetch user's memes from the backend API
        const response = await fetch(`/api/users/${userId}/memes`);
        const data = await response.json();
        setUserMemes(data);
      } catch (error) {
        console.error('Failed to fetch user memes:', error);
        // TODO: Handle error and show user-friendly message
      }
    };

    fetchUserMemes();
  }, [userId]);

  const handleNewMemeCreated = (metadata: MemeVideoMetadata) => {
    setUserMemes([...userMemes, metadata]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Memes</h2>
      <div className="grid grid-cols-3 gap-4">
        {userMemes.map((meme) => (
          <div key={meme.id} className="bg-gray-100 p-4 rounded">
            <h3 className="text-xl font-bold mb-2">{meme.title}</h3>
            <p>{meme.description}</p>
            {/* TODO: Render meme thumbnail and other metadata */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserWallet; 