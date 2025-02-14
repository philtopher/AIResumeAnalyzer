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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, FileText, Cpu, HardDrive, Activity, AlertTriangle } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

interface AnalyticsData {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  registeredUsers: number;
  anonymousUsers: number;
  premiumUsers: number;

  // CV conversion metrics
  totalConversions: number;
  registeredConversions: number;
  anonymousConversions: number;
  conversionRate: number;

  // System metrics
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeConnections: number;
  averageResponseTime: number;

  // Time-based metrics
  systemMetricsHistory: Array<{
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    storageUsage: number;
  }>;

  // Security metrics
  suspiciousActivities: Array<{
    ipAddress: string;
    location: string;
    reason: string;
    timestamp: string;
  }>;

  // Geographical data
  usersByLocation: Array<{ location: string; count: number }>;
  conversionsByLocation: Array<{ location: string; count: number }>;
}

export default function AdminDashboardPage() {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
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

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load analytics data</AlertDescription>
        </Alert>
      </div>
    );
  }

  const storageAlert = analytics?.storageUsage > 80;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        {storageAlert && (
          <Alert variant="warning" className="w-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Storage Warning</AlertTitle>
            <AlertDescription>
              Storage usage is above 80%. Consider cleanup.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* User Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalUsers}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.activeUsers} active in last 24h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Types</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.premiumUsers}</div>
                <div className="text-xs text-muted-foreground">
                  Premium users ({((analytics?.premiumUsers || 0) / (analytics?.totalUsers || 1) * 100).toFixed(1)}%)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalConversions}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics?.conversionRate}% conversion rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.activeConnections}</div>
                <div className="text-xs text-muted-foreground">
                  Active connections
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Resource Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.systemMetricsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cpuUsage" stroke="#8884d8" name="CPU" />
                    <Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" name="Memory" />
                    <Line type="monotone" dataKey="storageUsage" stroke="#ffc658" name="Storage" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographical Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.usersByLocation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.cpuUsage.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  Average over last hour
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.memoryUsage.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  Of total available memory
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.storageUsage.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  Of total storage capacity
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Metrics History</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.systemMetricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cpuUsage" stroke="#8884d8" name="CPU Usage %" />
                  <Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" name="Memory Usage %" />
                  <Line type="monotone" dataKey="storageUsage" stroke="#ffc658" name="Storage Usage %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.suspiciousActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{activity.ipAddress}</p>
                      <p className="text-sm text-muted-foreground">{activity.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{activity.reason}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}