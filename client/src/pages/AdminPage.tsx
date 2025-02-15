import { useState, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, ActivityLog, CV, Contact } from "@db/schema";
import AdminDashboardPage from "./AdminDashboardPage";
import { Mail, FileText, UserX } from "lucide-react";


type TabType = "dashboard" | "users" | "cvs" | "logs" | "contacts";

export default function AdminPage() {
  const { user, upgradeUser } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.role === "super_admin";

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: isSuperAdmin || activeTab === "users",
  });

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/logs"],
    enabled: activeTab === "logs",
  });

  const { data: pendingCVs = [], isLoading: isLoadingCVs } = useQuery<CV[]>({
    queryKey: ["/api/admin/cvs/pending"],
    enabled: activeTab === "cvs",
  });

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/admin/contacts"],
    enabled: activeTab === "contacts",
  });

  const addUserMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User added successfully",
      });
      setIsAddingUser(false);
      formRef.current?.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveCVMutation = useMutation({
    mutationFn: async ({
      cvId,
      status,
      comment,
    }: {
      cvId: number;
      status: "approved" | "rejected";
      comment?: string;
    }) => {
      const response = await fetch(`/api/admin/cvs/${cvId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cvs/pending"] });
      toast({
        title: "Success",
        description: "CV status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContactStatusMutation = useMutation({
    mutationFn: async ({ contactId, status }: { contactId: number; status: string }) => {
      const response = await fetch(`/api/admin/contacts/${contactId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      toast({
        title: "Success",
        description: "Contact status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, isPremium }: { userId: number; isPremium: boolean }) => {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User subscription updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addUserMutation.mutate(formData);
  }

  function handleDeleteUser(userId: number) {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  }

  if (!user || (user.role !== "super_admin" && user.role !== "sub_admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Administration</CardTitle>
              <div className="space-x-2">
                <Button
                  variant={activeTab === "dashboard" ? "default" : "outline"}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant={activeTab === "users" ? "default" : "outline"}
                  onClick={() => setActiveTab("users")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Users
                </Button>
                <Button
                  variant={activeTab === "cvs" ? "default" : "outline"}
                  onClick={() => setActiveTab("cvs")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Pending CVs
                </Button>
                <Button
                  variant={activeTab === "contacts" ? "default" : "outline"}
                  onClick={() => setActiveTab("contacts")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contacts
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "dashboard" && <AdminDashboardPage />}
            {activeTab === "users" && (
              <div className="space-y-6">
                {isSuperAdmin && (
                  <div className="flex justify-end">
                    <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New User</DialogTitle>
                          <DialogDescription>
                            Create a new user account with specified permissions.
                          </DialogDescription>
                        </DialogHeader>
                        <form ref={formRef} onSubmit={handleAddUser} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              name="username"
                              required
                              minLength={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                              id="password"
                              name="password"
                              type="password"
                              required
                              minLength={6}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select name="role" defaultValue="user">
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="sub_admin">Sub Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end">
                            <Button type="submit" disabled={addUserMutation.isPending}>
                              {addUserMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Add User"
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {isSuperAdmin ? (
                              <Select
                                value={user.role}
                                onValueChange={(newRole) =>
                                  updateRoleMutation.mutate({
                                    userId: user.id,
                                    role: newRole,
                                  })
                                }
                                disabled={user.role === "super_admin"}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="sub_admin">Sub Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="capitalize">{user.role}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.isPremium ? "premium" : "free"}
                              onValueChange={(value) =>
                                updateSubscriptionMutation.mutate({
                                  userId: user.id,
                                  isPremium: value === "premium",
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free Plan</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.role === "super_admin"}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
            {activeTab === "cvs" && (
              <div className="space-y-6">
                {isLoadingCVs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Target Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCVs.map((cv) => (
                        <TableRow key={cv.id}>
                          <TableCell>{cv.id}</TableCell>
                          <TableCell>{cv.userId}</TableCell>
                          <TableCell>{cv.targetRole}</TableCell>
                          <TableCell className="capitalize">{cv.approvalStatus}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  approveCVMutation.mutate({
                                    cvId: cv.id,
                                    status: "approved",
                                  })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  approveCVMutation.mutate({
                                    cvId: cv.id,
                                    status: "rejected",
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
            {activeTab === "logs" && (
              <div className="space-y-6">
                {isLoadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{log.userId}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            {log.details ? JSON.stringify(log.details) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
            {activeTab === "contacts" && (
              <div className="space-y-6">
                {isLoadingContacts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            {new Date(contact.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{contact.name}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{contact.subject}</TableCell>
                          <TableCell className="capitalize">{contact.status}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {contact.status === "new" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateContactStatusMutation.mutate({
                                      contactId: contact.id,
                                      status: "read",
                                    })
                                  }
                                >
                                  Mark as Read
                                </Button>
                              )}
                              {contact.status === "read" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateContactStatusMutation.mutate({
                                      contactId: contact.id,
                                      status: "responded",
                                    })
                                  }
                                >
                                  Mark as Responded
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}