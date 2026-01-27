import React from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

interface CreateCollectionFormProps {
  name: string;
  setName: (name: string) => void;
  selectedGroupId: string | undefined;
  setSelectedGroupId: (id: string | undefined) => void;
  userGroups: any[];
  onCreate: () => void;
}

export const CreateCollectionForm: React.FC<CreateCollectionFormProps> = ({
  name,
  setName,
  selectedGroupId,
  setSelectedGroupId,
  userGroups,
  onCreate,
}) => {
  return (
    <Card className="group relative overflow-hidden border-dashed mb-6 transition-all duration-300 hover:border-solid hover:shadow-md">
      {/* Subtle gradient overlay on hover */}
      {/* <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" /> */}

      <div className="relative p-5">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors duration-300">
            <FolderPlus className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold tracking-wide text-foreground">
            New Collection
          </h3>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          <Input
            className="h-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-left w-full"
            placeholder="Collection name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {userGroups.length > 0 && (
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="h-10 text-sm transition-all duration-200 hover:bg-accent/50 w-full">
                <SelectValue placeholder="Personal or Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold">
                    Collection Group
                  </SelectLabel>
                  <SelectItem value="personal" className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60" />
                      Personal (Private)
                    </div>
                  </SelectItem>
                  {userGroups.map((g: any) => (
                    <SelectItem
                      key={g.id}
                      value={String(g.id)}
                      className="text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        Group: {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            onClick={onCreate}
            disabled={!name.trim()}
            className="w-full h-10 font-medium shadow-sm hover:shadow transition-all duration-200"
          >
            Create Collection
          </Button>
        </div>
      </div>
    </Card>
  );
};
