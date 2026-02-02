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
    <div className="relative group w-full">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
        <Search className="h-6 w-6 text-muted-foreground/50 group-focus-within:text-primary" />
      </div>
      <Input
        placeholder={placeholder}
        className="pl-12 pr-12 h-14 rounded-full bg-white/10 border-white/10 shadow-xl backdrop-blur-xl text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all font-medium text-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
