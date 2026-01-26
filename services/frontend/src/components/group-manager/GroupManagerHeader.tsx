
import { Users } from "lucide-react";
import { UserStatus } from "../UserStatus";

export const GroupManagerHeader = () => {
  return (
    <div className="z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 py-4 shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold leading-none">
            Group Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1 leading-none">
            Manage teams & discover public groups
          </p>
        </div>
      </div>
      <UserStatus />
    </div>
  );
};
