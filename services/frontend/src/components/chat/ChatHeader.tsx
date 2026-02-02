import React from "react";
import { FolderOpen } from "lucide-react";
import { UserStatus } from "../user-status/UserStatus";

interface ChatHeaderProps {
  activeCollectionName: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeCollectionName,
}) => {
  return (
    <div className="z-10 flex items-center justify-between px-6 py-4 shadow-xl">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-6 w-6 text-primary" />
        <p className="flex items-center text-lg font-semibold">
          <span>{activeCollectionName}</span>
        </p>
      </div>
      <UserStatus />
    </div>
  );
};
