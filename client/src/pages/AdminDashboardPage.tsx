import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  FileText,
  Cpu,
  HardDrive,
  Activity,
  AlertTriangle,
  Globe,
  UserCheck,
  UserX,
  Crown,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  registeredUsers: number;
  anonymousUsers: number;
  premiumUsers: number;
  totalConversions: number;
  registeredConversions: number;
  anonymousConversions: number;
  conversionRate: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeConnections: number;
  systemMetricsHistory: Array<{
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    storageUsage: number;
  }>;
  suspiciousActivities: Array<{
    ipAddress: string;
    location: string;
    reason: string;
    timestamp: string;
  }>;
  usersByLocation: Array<{ location: string; count: number }>;
  conversionsByLocation: Array<{ location: string; count: number }>;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  subscription: {
    status: string;
    endedAt: string | null;
  } | null;
}

function AdminDashboardPage() {
  const { toast } = useToast();

  // Fetch analytics data
  const { data: analytics, isLoading: isLoadingAnalytics, error: analyticsError } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users data
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<User[]>({
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
    refetchInterval: 60000, // Refresh every minute
  });

  // Handle user deletion
  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle subscription status update
  const handleUpdateSubscription = async (userId: number, action: "activate" | "deactivate") => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: `Subscription ${action}d successfully`,
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle role update
  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoadingAnalytics || isLoadingUsers) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      </div>
    );
  }

  if (analyticsError || usersError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {analyticsError instanceof Error ? analyticsError.message : "Failed to load analytics data"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const storageAlert = (analytics?.storageUsage ?? 0) > 80;
  const memoryAlert = (analytics?.memoryUsage ?? 0) > 90;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          {storageAlert && (
            <Alert className="w-auto bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Storage Warning</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Storage usage is above 80%. Consider cleanup.
              </AlertDescription>
            </Alert>
          )}
          {memoryAlert && (
            <Alert className="w-auto bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Memory Warning</AlertTitle>
              <AlertDescription className="text-red-700">
                High memory usage detected.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="rounded-md border">
            <table className="min-w-full divide-y">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {user.username}
                        {!user.emailVerified && (
                          <Badge variant="outline" className="text-yellow-600">
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="sub_admin">Sub Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.subscription?.status === "active" ? (
                        <Badge className="bg-green-100 text-green-800">
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="outline">Free</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {user.subscription?.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateSubscription(user.id, "deactivate")}
                          >
                            Remove Pro
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateSubscription(user.id, "activate")}
                          >
                            Make Pro
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalUsers ?? 0}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.activeUsers ?? 0} active in last 24h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.premiumUsers ?? 0}</div>
                <div className="text-xs text-muted-foreground">
                  {((analytics?.premiumUsers ?? 0) / (analytics?.totalUsers || 1) * 100).toFixed(1)}% of total users
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalConversions ?? 0}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.conversionRate ?? 0}% conversion rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.activeConnections ?? 0}</div>
                <div className="text-xs text-muted-foreground">
                  Active connections
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resource Usage Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.systemMetricsHistory ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cpuUsage"
                    name="CPU Usage"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="memoryUsage"
                    name="Memory Usage"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Premium", value: analytics?.premiumUsers ?? 0 },
                      {
                        name: "Regular",
                        value: (analytics?.registeredUsers ?? 0) - (analytics?.premiumUsers ?? 0),
                      },
                      { name: "Anonymous", value: analytics?.anonymousUsers ?? 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminDashboardPage;