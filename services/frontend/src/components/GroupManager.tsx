import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyGroups, getPublicGroups, deleteGroup, joinPublicGroup, renameGroup, fetchSystemStatus, leaveGroup } from '../lib/api';
import { Globe, Copy, Trash2, LogIn, LogOut, Lock, Check, Users, Search, XCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { ScrollArea } from './ui/scroll-area';
import { useNavigate, useParams } from 'react-router-dom';
import { joinGroup } from '../lib/api';
import { UserStatus } from './UserStatus';

export const GroupManager = () => {
const queryClient = useQueryClient();
const { toast } = useToast();

// Search State
const [searchQuery, setSearchQuery] = useState("");

// Rename State
const [renameId, setRenameId] = useState<number | null>(null);
const [renameName, setRenameName] = useState("");

const { data: systemStatus } = useQuery({ queryKey: ['session'], queryFn: fetchSystemStatus });
const { data: myGroups = [] } = useQuery({ queryKey: ['my_groups'], queryFn: getMyGroups });
const { data: publicGroups = [] } = useQuery({ queryKey: ['public_groups'], queryFn: getPublicGroups });

const currentUserId = systemStatus?.user?.id;

// Filter Logic
const filteredPublicGroups = publicGroups.filter((group: any) => {
    const query = searchQuery.toLowerCase();
    return (
        group.name.toLowerCase().includes(query) || 
        group.owner_name.toLowerCase().includes(query)
    );
});

const handleRename = async () => {
    if (!renameId || !renameName.trim()) return;
    try {
        await renameGroup(renameId, renameName);
        await queryClient.invalidateQueries({ queryKey: ['my_groups'] });
        await queryClient.invalidateQueries({ queryKey: ['public_groups'] });
        setRenameId(null);
        toast({ title: "Renamed", description: "Group name updated." });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not rename group." });
    }
};

const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my_groups'] });
        queryClient.invalidateQueries({ queryKey: ['public_groups'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] }); // Force sidebar update
        toast({ title: "Group Deleted", description: "The group has been removed." });
    },
    onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Only the owner can delete this group." });
    }
});

const leaveMutation = useMutation({
    mutationFn: leaveGroup,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my_groups'] });
        queryClient.invalidateQueries({ queryKey: ['public_groups'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] }); // Force sidebar update (Instant Populate)
        toast({ title: "Left Group", description: "You have left the group." });
    },
    onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Could not leave group." });
    }
});

const joinMutation = useMutation({
    mutationFn: joinPublicGroup,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my_groups'] });
        queryClient.invalidateQueries({ queryKey: ['public_groups'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] }); // Force sidebar update (Instant Populate)
        toast({ title: "Joined Group", description: "You are now a member." });
    }
});

const copyInvite = (token: string) => {
    const link = `${window.location.origin}/groups/join/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied", description: "Invite link ready to share." });
};

return (
    <div className="h-full flex flex-col bg-background">
        
        {/* --- UPDATED HEADER --- */}
        <div className="z-10 flex items-center justify-between border-b bg-card px-6 py-4 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <div>
                    <h1 className="text-lg font-semibold leading-none">Group Management</h1>
                    <p className="text-xs text-muted-foreground mt-1 leading-none">Manage teams & permissions</p>
                </div>
            </div>
            <UserStatus />
        </div>

        <div className="flex-1 overflow-hidden p-8 bg-muted/10">
            <Tabs defaultValue="my_groups" className="h-full flex flex-col">
                <TabsList className="w-[400px] shrink-0 mx-auto mb-6">
                    <TabsTrigger value="my_groups">My Groups ({myGroups.length})</TabsTrigger>
                    <TabsTrigger value="explore">Explore Public</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-4">
                    <TabsContent value="my_groups" className="mt-0 space-y-4">
                        {myGroups.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
                                No groups yet. Create one in the sidebar!
                            </div>
                        )}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {myGroups.map((group: any) => {
                                const isOwner = currentUserId === group.owner_id;
                                return (
                                    <Card key={group.id}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                {group.name}
                                                {group.is_public ? <Globe className="h-3 w-3 text-blue-500" /> : <Lock className="h-3 w-3 text-amber-500" />}
                                            </CardTitle>
                                                <Badge variant="outline" className="text-xs">
                                                {group.member_count} {group.member_count === 1 ? "member" : "members"}
                                                </Badge>
                                        </CardHeader>
                                        <CardContent>
                                            <CardDescription className="mb-4 line-clamp-2 min-h-[40px]">{group.description || "No description provided."}</CardDescription>
                                            <div className="text-xs text-muted-foreground mb-4">
                                                Owner: <span className="font-medium text-foreground">{group.owner_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t pt-4">
                                                <Button variant="outline" size="sm" onClick={() => copyInvite(group.invite_token)}>
                                                    <Copy className="h-3 w-3 mr-2" /> Invite Link
                                                </Button>
                                                
                                                <div className="flex gap-2">
                                                    {isOwner ? (
                                                        <>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-muted-foreground hover:text-primary"
                                                                onClick={() => {
                                                                    setRenameId(group.id);
                                                                    setRenameName(group.name);
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Permanently delete <b>{group.name}</b> and all its collections?
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction 
                                                                            className="bg-destructive hover:bg-destructive/90"
                                                                            onClick={() => deleteMutation.mutate(group.id)}
                                                                        >
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </>
                                                    ) : (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="text-orange-600 hover:bg-orange-100 hover:text-orange-700">
                                                                    <LogOut className="h-4 w-4 mr-1" /> Leave
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        You will lose access to <b>{group.name}</b>'s collections.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        className="bg-orange-600 hover:bg-orange-700"
                                                                        onClick={() => leaveMutation.mutate(group.id)}
                                                                    >
                                                                        Leave
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="explore" className="mt-0">
                        {/* --- Search Bar --- */}
                        <div className="mb-6 relative max-w-lg mx-auto">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by group name or owner..." 
                                className="pl-9 h-10 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <XCircle 
                                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                                    onClick={() => setSearchQuery("")}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {filteredPublicGroups.map((group: any) => (
                                <Card key={group.id} className="bg-white dark:bg-card border-dashed">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {group.name}
                                            <Badge variant="secondary" className="text-[10px] font-normal">Public</Badge>
                                        </CardTitle>
                                        <CardDescription>{group.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">
                                                {/* {console.log(group.member_count===1)} */}
                                            {group.member_count} {group.member_count === 1 ? "member" : "members"} &bull; Owner: {group.owner_name}
                                            </span>
                                            
                                            {group.is_member ? (
                                                <Button size="sm" variant="secondary" disabled className="opacity-70">
                                                    <Check className="h-3 w-3 mr-2" /> Joined
                                                </Button>
                                            ) : (
                                                <Button size="sm" onClick={() => joinMutation.mutate(group.id)}>
                                                    <LogIn className="h-3 w-3 mr-2" /> Join
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredPublicGroups.length === 0 && (
                                <div className="col-span-2 flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="h-10 w-10 mb-2 opacity-20" />
                                    <p>No public groups found.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>

        {/* --- GROUP RENAME DIALOG --- */}
        <Dialog open={!!renameId} onOpenChange={(open) => !open && setRenameId(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Group</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        value={renameName} 
                        onChange={(e) => setRenameName(e.target.value)} 
                        placeholder="New Group Name" 
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button>
                    <Button onClick={handleRename} disabled={!renameName.trim()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
);

};

// Invite Handler Wrapper
export const InviteHandler = () => {
const { token } = useParams();
const navigate = useNavigate();
const { toast } = useToast();
const { mutate } = useMutation({
mutationFn: () => joinGroup(token!),
onSuccess: () => {
toast({ title: "Joined Group", description: "You have been added to the group." });
navigate("/");
},
onError: () => {
toast({ variant: "destructive", title: "Error", description: "Invalid link or you are already a member." });
navigate("/");
}
});

React.useEffect(() => {
    if (token) mutate();
}, [token]);

return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground animate-pulse">Joining Group...</p>
    </div>
);

};