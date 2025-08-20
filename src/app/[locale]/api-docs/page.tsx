'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Copy, ExternalLink, Shield, Clock, FileText, Code } from 'lucide-react';

interface ApiSpec {
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  servers?: Array<{
    url: string;
    description: string;
  }>;
  paths?: Record<string, Record<string, EndpointSpec>>;
  components?: {
    schemas?: Record<string, SchemaSpec>;
  };
}

interface EndpointSpec {
  summary?: string;
  description?: string;
  parameters?: ParameterSpec[];
  responses?: Record<string, unknown>;
}

interface ParameterSpec {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: SchemaSpec;
}

interface SchemaSpec {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

interface TestResult {
  loading?: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

/**
 * API Documentation Page
 * 
 * Provides an interactive interface for exploring and testing
 * the Loom Coaching App API. This page allows developers to:
 * - Browse all available endpoints
 * - View request/response schemas
 * - Test API calls directly from the browser
 * - Authenticate and make authorized requests
 */

export default function ApiDocumentationPage() {
  const [apiSpec, setApiSpec] = useState<ApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState('');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    // Load the API specification
    fetch('/api/docs')
      .then(response => response.json())
      .then(data => {
        setApiSpec(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load API specification:', error);
        setLoading(false);
      });

    // Load saved auth token
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setAuthToken(savedToken);
    }
  }, []);

  const saveAuthToken = () => {
    localStorage.setItem('authToken', authToken);
    alert('Token saved successfully!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const testEndpoint = async (path: string, method: string, _endpoint: EndpointSpec) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const testKey = `${method.toUpperCase()} ${path}`;
      setTestResults(prev => ({ ...prev, [testKey]: { loading: true } }));

      const response = await fetch(`/api${path.replace(/\{[^}]+\}/g, 'test-id')}`, {
        method: method.toUpperCase(),
        headers,
        ...(method.toLowerCase() !== 'get' ? { body: JSON.stringify({}) } : {})
      });

      const result = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          status: response.status,
          data: result,
          loading: false
        }
      }));
    } catch (error) {
      const testKey = `${method.toUpperCase()} ${path}`;
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        }
      }));
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'post':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'put':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'patch':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Loading API Documentation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!apiSpec) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <Alert>
              <AlertDescription>
                Failed to load API documentation. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const endpoints = Object.entries(apiSpec.paths || {}).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, endpoint]) => ({
      path,
      method,
      endpoint: endpoint as EndpointSpec,
      testKey: `${method.toUpperCase()} ${path}`
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {apiSpec.info?.title || 'API Documentation'}
              </h1>
              <p className="text-gray-600 mt-1">
                {apiSpec.info?.description || 'Interactive API documentation'}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="outline">v{apiSpec.info?.version || '1.0.0'}</Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Authenticated</span>
                </Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Rate Limited</span>
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/auth/signin" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Get Token
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/health" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Health Check
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Authentication</span>
                </CardTitle>
                <CardDescription>
                  Enter your JWT token to test authenticated endpoints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="token">JWT Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Enter your JWT token..."
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                  />
                </div>
                <Button onClick={saveAuthToken} className="w-full">
                  Save Token
                </Button>
                
                <Alert>
                  <AlertDescription className="text-xs">
                    Token is stored locally and included in test requests. 
                    Sign in through the app to get a valid token.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">API Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Endpoints</span>
                    <span className="font-medium">{endpoints.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Base URL</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {apiSpec.servers?.[0]?.url || '/api'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="endpoints" className="space-y-4">
              <TabsList>
                <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                <TabsTrigger value="schemas">Schemas</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>

              <TabsContent value="endpoints" className="space-y-4">
                {endpoints.map(({ path, method, endpoint, testKey }) => (
                  <Card key={testKey}>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Badge className={getMethodColor(method)}>
                                {method.toUpperCase()}
                              </Badge>
                              <code className="font-mono text-sm">{path}</code>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                            <div className="text-sm text-gray-600">
                              {endpoint.summary || 'No description'}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-4">
                            {endpoint.description && (
                              <p className="text-gray-600">{endpoint.description}</p>
                            )}

                            {endpoint.parameters && (
                              <div>
                                <h4 className="font-medium mb-2">Parameters</h4>
                                <div className="space-y-2">
                                  {endpoint.parameters.map((param: ParameterSpec, idx: number) => (
                                    <div key={idx} className="border rounded p-3">
                                      <div className="flex items-center space-x-2">
                                        <code className="text-sm font-mono">{param.name}</code>
                                        <Badge variant="outline">{param.in}</Badge>
                                        {param.required && (
                                          <Badge variant="destructive" className="text-xs">Required</Badge>
                                        )}
                                      </div>
                                      {param.description && (
                                        <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => testEndpoint(path, method, endpoint)}
                                disabled={testResults[testKey]?.loading}
                              >
                                {testResults[testKey]?.loading ? 'Testing...' : 'Test Endpoint'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(`curl -X ${method.toUpperCase()} "${apiSpec.servers?.[0]?.url || '/api'}${path}" -H "Authorization: Bearer YOUR_TOKEN"`)}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                Copy cURL
                              </Button>
                            </div>

                            {testResults[testKey] && !testResults[testKey].loading && (
                              <div className="border rounded p-3 bg-gray-50">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm font-medium">Response:</span>
                                  {testResults[testKey].status && (
                                    <Badge 
                                      variant={testResults[testKey].status < 400 ? "default" : "destructive"}
                                    >
                                      {testResults[testKey].status}
                                    </Badge>
                                  )}
                                </div>
                                <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                  {JSON.stringify(
                                    testResults[testKey].data || testResults[testKey].error,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="schemas">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <span>Data Schemas</span>
                    </CardTitle>
                    <CardDescription>
                      Common data structures used throughout the API
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(apiSpec.components?.schemas || {}).map(([name, schema]) => (
                        <div key={name} className="border rounded p-4">
                          <h4 className="font-medium mb-2">{name}</h4>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(schema, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="examples">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Code Examples</span>
                    </CardTitle>
                    <CardDescription>
                      Sample code for common API operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">Authentication</h4>
                        <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-auto">
{`// Sign in and get token
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { data: { user } } = await response.json();
const token = response.headers.get('Authorization')?.split(' ')[1];`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Making Authenticated Requests</h4>
                        <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-auto">
{`// Use token in subsequent requests
const sessions = await fetch('/api/sessions', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});

const { data } = await sessions.json();`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Error Handling</h4>
                        <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded overflow-auto">
{`// Handle API errors
try {
  const response = await fetch('/api/sessions/book', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      coachId: 'coach-id',
      title: 'Session Title',
      scheduledAt: '2024-01-15T14:30:00Z',
      durationMinutes: 60
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const { data: session } = await response.json();
  console.log('Session booked:', session);
} catch (error) {
  console.error('Booking failed:', error.message);
}`}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}