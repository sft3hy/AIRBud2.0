import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { joinGroup } from "../../lib/api";

export const InviteHandler = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate } = useMutation({
    mutationFn: () => joinGroup(token!),
    onSuccess: () => {
      toast({
        title: "Joined Group",
        description: "You have been added to the group.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid link or you are already a member.",
      });
      navigate("/");
    },
  });

  React.useEffect(() => {
    if (token) mutate();
  }, [token]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-transparent gap-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      <p className="text-muted-foreground animate-pulse">Joining Group...</p>
    </div>
  );
};
