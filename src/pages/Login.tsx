import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  User, 
  GraduationCap, 
  Shield, 
  AlertCircle,
  Mail,
  Lock,
  UserCheck
} from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordResetForm from '../components/PasswordResetForm';
import UserSignup from '../components/UserSignup';

export default function Login() {
  const [activeTab, setActiveTab] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const navigate = useNavigate();
  const { studentLogin, teacherLogin, adminLogin } = useAuth();

  const userTypes = [
    {
      id: 'student',
      label: 'Student',
      icon: <User className="h-4 w-4" />,
      description: 'Access your grades and assignments',
      placeholder: 'Student ID or Email',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'teacher',
      label: 'Teacher',
      icon: <GraduationCap className="h-4 w-4" />,
      description: 'Manage classes and grade students',
      placeholder: 'Email Address',
      color: 'bg-green-50 border-green-200'
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <Shield className="h-4 w-4" />,
      description: 'System administration and management',
      placeholder: 'Username or Email',
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError('Please enter all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let userData;
      
      if (activeTab === 'student') {
        userData = await studentLogin(trimmedUsername, password);
      } else if (activeTab === 'teacher') {
        userData = await teacherLogin(trimmedUsername, password);
      } else if (activeTab === 'admin') {
        userData = await adminLogin(trimmedUsername, password);
      }
      
      if (!userData) {
        setError('Login failed - no user data received');
        return;
      }
      
      const redirectPath = sessionStorage.getItem('auth:redirectPath');
      sessionStorage.removeItem('auth:redirectPath');
      sessionStorage.removeItem('auth:error');
      sessionStorage.removeItem('auth:errorTime');
      
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        if (userData.role === 'student') {
          navigate('/student');
        } else if (userData.role === 'teacher') {
          navigate('/teacher');
        } else if (userData.role === 'admin') {
          navigate('/admin');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid credentials. Please check your email/username and password.');
      } else {
        setError(error.message || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSuccess = () => {
    setShowSignup(false);
    setError('');
  };

  if (showSignup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container max-w-2xl mx-auto px-6 py-8">
          <Button
            variant="ghost"
            onClick={() => setShowSignup(false)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
          <UserSignup 
            onSuccess={handleSignupSuccess}
            onCancel={() => setShowSignup(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container max-w-md mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {showResetPassword ? (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-black">Reset Password</CardTitle>
              <CardDescription>
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordResetForm 
                email={activeTab === 'teacher' ? username : ''}
                onClose={() => setShowResetPassword(false)} 
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-black rounded-full">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-black">Welcome Back</CardTitle>
              <CardDescription className="text-lg">
                Sign in to access your Evalis portal
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                  {userTypes.map((type) => (
                    <TabsTrigger 
                      key={type.id}
                      value={type.id}
                      className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-black"
                    >
                      {type.icon}
                      <span className="hidden sm:inline">{type.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {userTypes.map((type) => (
                  <TabsContent key={type.id} value={type.id} className="space-y-4">
                    <div className={`p-4 rounded-lg ${type.color}`}>
                      <div className="flex items-center gap-3 mb-2">
                        {type.icon}
                        <h3 className="font-semibold text-black">{type.label} Portal</h3>
                      </div>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-black font-medium">
                          {type.id === 'teacher' ? 'Email' : type.id === 'admin' ? 'Username or Email' : 'Student ID or Email'}
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="username"
                            type={type.id === 'teacher' ? 'email' : 'text'}
                            placeholder={type.placeholder}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-10 border-gray-200 focus:border-black focus:ring-black"
                            required
                          />
                        </div>
                        {type.id === 'student' && (
                          <p className="text-xs text-gray-500">
                            Use your student ID (e.g., S00001) or email address
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-black font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 border-gray-200 focus:border-black focus:ring-black"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-black hover:bg-gray-800 text-white py-3 text-lg font-medium"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Signing in...
                          </div>
                        ) : (
                          `Sign in as ${type.label}`
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowResetPassword(true)}
                    className="text-gray-600 hover:text-black p-0 h-auto font-normal"
                  >
                    Forgot your password?
                  </Button>
                </div>
                
                {activeTab === 'student' && (
                  <div className="text-center">
                    <span className="text-sm text-gray-600">Don't have an account? </span>
                    <Button
                      variant="link"
                      onClick={() => setShowSignup(true)}
                      className="text-black hover:text-gray-800 p-0 h-auto font-medium"
                    >
                      Sign up
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}