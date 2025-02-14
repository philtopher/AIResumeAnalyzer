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

  const storageAlert = (analytics?.storageUsage ?? 0) > 80;
  const memoryAlert = (analytics?.memoryUsage ?? 0) > 90;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users & Conversions</TabsTrigger>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overview Cards */}
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
                <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.premiumUsers}</div>
                <div className="text-xs text-muted-foreground">
                  {((analytics?.premiumUsers || 0) / (analytics?.totalUsers || 1) * 100).toFixed(1)}% of total users
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

          {/* Overview Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.systemMetricsHistory}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="cpuUsage" stroke="#8884d8" fillOpacity={1} fill="url(#colorCpu)" name="CPU" />
                    <Area type="monotone" dataKey="memoryUsage" stroke="#82ca9d" fillOpacity={1} fill="url(#colorMemory)" name="Memory" />
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
                        { name: 'Premium', value: analytics?.premiumUsers || 0 },
                        { name: 'Regular', value: (analytics?.registeredUsers || 0) - (analytics?.premiumUsers || 0) },
                        { name: 'Anonymous', value: analytics?.anonymousUsers || 0 },
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
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.registeredUsers}</div>
                <div className="text-xs text-muted-foreground">
                  {((analytics?.registeredUsers || 0) / (analytics?.totalUsers || 1) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anonymous Users</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.anonymousUsers}</div>
                <div className="text-xs text-muted-foreground">
                  {((analytics?.anonymousUsers || 0) / (analytics?.totalUsers || 1) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.activeUsers}</div>
                <div className="text-xs text-muted-foreground">
                  In the last 24 hours
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Growth & Conversions</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {
                    name: 'Registered',
                    users: analytics?.registeredUsers || 0,
                    conversions: analytics?.registeredConversions || 0,
                  },
                  {
                    name: 'Anonymous',
                    users: analytics?.anonymousUsers || 0,
                    conversions: analytics?.anonymousConversions || 0,
                  },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="users" fill="#8884d8" name="Users" />
                  <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
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
              <CardTitle>System Performance History</CardTitle>
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
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-accent/5 transition-colors">
                    <div>
                      <p className="font-medium">{activity.ipAddress}</p>
                      <p className="text-sm text-muted-foreground">{activity.location}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="destructive">{activity.reason}</Badge>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {(!analytics?.suspiciousActivities || analytics.suspiciousActivities.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No suspicious activities detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Users by Location</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.usersByLocation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversions by Location</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.conversionsByLocation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}