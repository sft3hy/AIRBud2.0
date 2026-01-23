import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GroupSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

export const GroupSearchBar: React.FC<GroupSearchBarProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div className="mb-6 relative max-w-lg mx-auto">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9 pr-9 h-10 shadow-sm bg-background/50 backdrop-blur-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
