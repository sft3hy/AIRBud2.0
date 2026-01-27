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
    <Card className="group relative overflow-hidden border-dashed border-2 mb-6 transition-all duration-300 hover:border-solid hover:border-primary/20 hover:shadow-lg bg-card/50">
      <div className="relative p-5">
        <div className="flex flex-col items-center justify-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              New Collection
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Create a space for your documents
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            className="h-9 text-sm bg-background/50 focus:bg-background transition-colors"
            placeholder="Collection name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {userGroups.length > 0 && (
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="h-9 text-sm bg-background/50 focus:bg-background transition-colors w-full">
                <SelectValue placeholder="Assign to Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                    Group
                  </SelectLabel>
                  <SelectItem value="personal" className="text-sm cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Personal (Private)
                    </div>
                  </SelectItem>
                  {userGroups.map((g: any) => (
                    <SelectItem
                      key={g.id}
                      value={String(g.id)}
                      className="text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {g.name}
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
            className="w-full h-9 font-medium shadow-sm transition-all duration-200"
          >
            Create Collection
          </Button>
        </div>
      </div>
    </Card>
  );
};
