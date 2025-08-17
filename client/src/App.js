import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { 
  FileText, 
  Download, 
  Sparkles, 
  Settings, 
  Users, 
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Palette,
  Layout,
  Star,
  Zap,
  TrendingUp,
  Lightbulb,
  BarChart3,
  Presentation,
  Eye,
  Edit3,
  Play,
  Share2,
  BookOpen,
  Briefcase,
  GraduationCap,
  DollarSign,
  Heart,
  Globe,
  Shield,
  Award,
  Brain,
  Cpu,
  Rocket,
  Infinity,
  Layers,
  Sparkle,
  Bot,
  Code,
  Database,
  Cloud,
  Wifi,
  Lock,
  Unlock,
  Crown,
  Gem,
  Target as TargetIcon,
  BarChart,
  PieChart,
  LineChart,
  Activity,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Upload,
  Filter,
  Search,
  Sliders,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import axios from 'axios';

function App() {
  const [formData, setFormData] = useState({
    topic: '',
    audience: 'General business audience',
    style: 'Professional and modern',
    slides: 10,
    additionalInfo: '',
    aiModel: 'gpt-3.5-turbo',
    presentationType: 'business'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('ai-modern');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [generationMode, setGenerationMode] = useState('ai'); // 'ai' or 'canva'
  const [canvaTemplates, setCanvaTemplates] = useState([]);
  const [selectedCanvaTemplate, setSelectedCanvaTemplate] = useState('business');

  // AI Model configurations
  const aiModels = [
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and efficient for most presentations',
      icon: <Zap className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      isFree: true,
      speed: 'Fast',
      quality: 'Good'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Enhanced creativity and structure',
      icon: <Brain className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      isFree: true,
      speed: 'Medium',
      quality: 'Better'
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'Premium quality with advanced insights',
      icon: <Crown className="w-5 h-5" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      isFree: false,
      speed: 'Slower',
      quality: 'Best'
    },
    {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      description: 'Fast and creative alternative',
      icon: <Bot className="w-5 h-5" />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      isFree: true,
      speed: 'Fast',
      quality: 'Good'
    }
  ];

  // Enhanced AI-powered templates
  const templates = [
    {
      id: 'ai-modern',
      name: 'AI Modern Pro',
      icon: <Sparkles className="w-6 h-6" />,
      colors: ['#6366F1', '#8B5CF6', '#EC4899'],
      description: 'AI-optimized modern design with neural network aesthetics',
      features: ['Smart Layout', 'AI Icons', 'Dynamic Colors'],
      category: 'ai-powered'
    },
    {
      id: 'ai-corporate',
      name: 'AI Corporate Elite',
      icon: <Crown className="w-6 h-6" />,
      colors: ['#1E293B', '#334155', '#3B82F6'],
      description: 'Executive-level AI-enhanced corporate presentation',
      features: ['Executive Style', 'Data Visualization', 'Professional Icons'],
      category: 'ai-powered'
    },
    {
      id: 'ai-creative',
      name: 'AI Creative Studio',
      icon: <Palette className="w-6 h-6" />,
      colors: ['#8B5CF6', '#EC4899', '#F59E0B'],
      description: 'AI-generated creative designs with artistic elements',
      features: ['Creative Layouts', 'Color Harmony', 'Visual Impact'],
      category: 'ai-powered'
    },
    {
      id: 'ai-minimal',
      name: 'AI Minimal Clean',
      icon: <Layout className="w-6 h-6" />,
      colors: ['#6B7280', '#9CA3AF', '#D1D5DB'],
      description: 'AI-optimized minimal design with smart spacing',
      features: ['Clean Design', 'Smart Typography', 'Focused Content'],
      category: 'ai-powered'
    },
    {
      id: 'ai-tech',
      name: 'AI Tech Future',
      icon: <Cpu className="w-6 h-6" />,
      colors: ['#059669', '#10B981', '#34D399'],
      description: 'Futuristic tech presentation with AI elements',
      features: ['Tech Aesthetics', 'Digital Elements', 'Future Focus'],
      category: 'ai-powered'
    },
    {
      id: 'ai-data',
      name: 'AI Data Analytics',
      icon: <BarChart3 className="w-6 h-6" />,
      colors: ['#DC2626', '#EF4444', '#F87171'],
      description: 'Data-driven presentation with AI insights',
      features: ['Data Visualization', 'Analytics Focus', 'Insight Generation'],
      category: 'ai-powered'
    }
  ];

  const presentationTypes = [
    { value: 'business', icon: <Briefcase className="w-4 h-4" />, label: 'Business Strategy' },
    { value: 'marketing', icon: <TrendingUp className="w-4 h-4" />, label: 'Marketing & Sales' },
    { value: 'technical', icon: <Code className="w-4 h-4" />, label: 'Technical Report' },
    { value: 'educational', icon: <GraduationCap className="w-4 h-4" />, label: 'Educational' },
    { value: 'pitch', icon: <Rocket className="w-4 h-4" />, label: 'Pitch Deck' },
    { value: 'analysis', icon: <BarChart className="w-4 h-4" />, label: 'Data Analysis' }
  ];

  const audienceOptions = [
    { value: 'General business audience', icon: <Users className="w-4 h-4" />, label: 'General Business' },
    { value: 'Executives and C-level', icon: <Award className="w-4 h-4" />, label: 'Executives' },
    { value: 'Technical team', icon: <Zap className="w-4 h-4" />, label: 'Technical Team' },
    { value: 'Sales and marketing', icon: <TrendingUp className="w-4 h-4" />, label: 'Sales & Marketing' },
    { value: 'Students and educators', icon: <GraduationCap className="w-4 h-4" />, label: 'Education' },
    { value: 'Investors', icon: <DollarSign className="w-4 h-4" />, label: 'Investors' },
    { value: 'Clients and customers', icon: <Heart className="w-4 h-4" />, label: 'Clients' },
    { value: 'Industry experts', icon: <Star className="w-4 h-4" />, label: 'Experts' }
  ];

  const styleOptions = [
    { value: 'Professional and modern', icon: <Briefcase className="w-4 h-4" />, label: 'Professional' },
    { value: 'Creative and engaging', icon: <Palette className="w-4 h-4" />, label: 'Creative' },
    { value: 'Minimalist and clean', icon: <Layout className="w-4 h-4" />, label: 'Minimalist' },
    { value: 'Corporate and formal', icon: <Shield className="w-4 h-4" />, label: 'Corporate' },
    { value: 'Educational and informative', icon: <BookOpen className="w-4 h-4" />, label: 'Educational' },
    { value: 'Innovative and futuristic', icon: <Rocket className="w-4 h-4" />, label: 'Innovative' },
    { value: 'Data-driven and analytical', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytical' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateContent = async () => {
    if (!formData.topic.trim()) {
      toast.error('Please enter a presentation topic');
      return;
    }

    setIsGenerating(true);
    setCurrentStep(2);

    try {
      let endpoint = '/api/generate-content';
      let requestData = {
        ...formData,
        template: selectedTemplate
      };

      if (generationMode === 'canva') {
        endpoint = '/api/canva/generate-presentation';
        requestData = {
          ...formData,
          template: selectedCanvaTemplate
        };
      }

      const response = await axios.post(endpoint, requestData, {
        responseType: 'blob' // Important: Set response type to blob for file download
      });
      
      // Create download link for the PowerPoint file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = generationMode === 'canva' ? 'canva-presentation.pptx' : 'ai-presentation.pptx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setCurrentStep(3);
      toast.success(`${generationMode === 'canva' ? 'Canva' : 'AI'} PowerPoint generated and downloaded successfully!`, {
        duration: 4000,
        icon: '🎯'
      });
    } catch (error) {
      console.error('Error generating PowerPoint:', error);
      const errorMessage = error.response?.data?.error || 'Failed to generate PowerPoint. Please try again.';
      toast.error(errorMessage);
      setCurrentStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch Canva templates
  const fetchCanvaTemplates = async () => {
    try {
      const response = await axios.get('/api/canva/templates');
      setCanvaTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching Canva templates:', error);
      // Set default templates if API fails
      setCanvaTemplates([
        { id: 'business', name: 'Business Professional', category: 'Business' },
        { id: 'creative', name: 'Creative Modern', category: 'Creative' },
        { id: 'minimal', name: 'Minimal Clean', category: 'Minimal' },
        { id: 'tech', name: 'Technology', category: 'Technology' }
      ]);
    }
  };

  // Load Canva templates when switching to Canva mode
  useEffect(() => {
    if (generationMode === 'canva' && canvaTemplates.length === 0) {
      fetchCanvaTemplates();
    }
  }, [generationMode]);



  const resetForm = () => {
    setFormData({
      topic: '',
      audience: 'General business audience',
      style: 'Professional and modern',
      slides: 10,
      additionalInfo: '',
      aiModel: 'gpt-3.5-turbo',
      presentationType: 'business'
    });
    setGeneratedContent(null);
    setCurrentStep(1);
    setSelectedTemplate('ai-modern');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="text-center py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white ml-4">AI Presentation Pro</h1>
          </div>
          <p className="text-white/80 text-xl max-w-3xl mx-auto leading-relaxed">
            Professional AI-powered presentation generator with advanced models and intelligent design
          </p>
          
          {/* Feature highlights */}
          <div className="flex justify-center mt-6 space-x-8">
            <div className="flex items-center text-white/80">
              <Brain className="w-5 h-5 mr-2 text-blue-400" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center text-white/80">
              <Crown className="w-5 h-5 mr-2 text-purple-400" />
              <span>Professional</span>
            </div>
            <div className="flex items-center text-white/80">
              <Rocket className="w-5 h-5 mr-2 text-green-400" />
              <span>Instant</span>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep >= step 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-110' 
                      : 'bg-white/10 text-white/60 border border-white/20'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-20 h-1 mx-3 rounded-full transition-all duration-300 ${
                      currentStep > step ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Input Form */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Generation Mode Selection */}
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2" />
                  Choose Generation Method
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI Generation Mode */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGenerationMode('ai')}
                    className={`p-6 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                      generationMode === 'ai'
                        ? 'bg-white/20 border-blue-500 shadow-lg'
                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center mb-4">
                      <div className="text-blue-400 mr-3">
                        <Brain className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">AI-Powered Generation</h3>
                        <p className="text-white/70 text-sm">Advanced AI models with custom templates</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                        <span>Multiple AI models (GPT-4, GPT-3.5, Claude)</span>
                      </div>
                      <div className="flex items-center text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                        <span>Custom AI-powered templates</span>
                      </div>
                      <div className="flex items-center text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                        <span>Advanced content generation</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Canva Generation Mode */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGenerationMode('canva')}
                    className={`p-6 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                      generationMode === 'canva'
                        ? 'bg-white/20 border-purple-500 shadow-lg'
                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center mb-4">
                      <div className="text-purple-400 mr-3">
                        <Palette className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">Canva Integration</h3>
                        <p className="text-white/70 text-sm">Professional Canva templates and design</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                        <span>Professional Canva templates</span>
                      </div>
                      <div className="flex items-center text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                        <span>High-quality design elements</span>
                      </div>
                      <div className="flex items-center text-white/80 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                        <span>Export to PowerPoint format</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* AI Model Selection - Only show for AI mode */}
              {generationMode === 'ai' && (
                <div className="card">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Brain className="w-6 h-6 mr-2" />
                    Choose Your AI Model
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiModels.map((model) => (
                      <motion.div
                        key={model.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData(prev => ({ ...prev, aiModel: model.id }))}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                          formData.aiModel === model.id
                            ? 'bg-white/20 border-blue-500 shadow-lg'
                            : 'bg-white/10 border-white/20 hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`${model.color} mr-2`}>{model.icon}</div>
                          <h3 className="text-white font-semibold flex-1">{model.name}</h3>
                          {model.isFree ? (
                            <Unlock className="w-4 h-4 text-green-400" />
                          ) : (
                            <Lock className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <p className="text-white/70 text-sm mb-3">{model.description}</p>
                        <div className="flex justify-between text-xs text-white/60">
                          <span>Speed: {model.speed}</span>
                          <span>Quality: {model.quality}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Selection */}
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2" />
                  {generationMode === 'ai' ? 'AI-Powered Templates' : 'Canva Templates'}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generationMode === 'ai' ? (
                    // AI Templates
                    templates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedTemplate === template.id
                            ? 'bg-white/20 border-2 border-blue-500 shadow-lg'
                            : 'bg-white/10 border border-white/20 hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center mb-3">
                          <div className="text-white mr-2">{template.icon}</div>
                          <h3 className="text-white font-semibold">{template.name}</h3>
                        </div>
                        <p className="text-white/70 text-sm mb-3">{template.description}</p>
                        <div className="flex space-x-2 mb-3">
                          {template.colors.map((color, index) => (
                            <div
                              key={index}
                              className="w-6 h-6 rounded-full border border-white/30"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.features.map((feature, index) => (
                            <span key={index} className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    // Canva Templates
                    canvaTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedCanvaTemplate(template.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedCanvaTemplate === template.id
                            ? 'bg-white/20 border-2 border-purple-500 shadow-lg'
                            : 'bg-white/10 border border-white/20 hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center mb-3">
                          <div className="text-purple-400 mr-2">
                            <Palette className="w-6 h-6" />
                          </div>
                          <h3 className="text-white font-semibold">{template.name}</h3>
                        </div>
                        <p className="text-white/70 text-sm mb-3">
                          Professional Canva template for {template.category.toLowerCase()} presentations
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            {template.category}
                          </span>
                          <span className="text-xs text-white/60">Canva Pro</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Presentation Details */}
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  Presentation Details
                </h2>

                <div className="space-y-6">
                  {/* Topic */}
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Presentation Topic *
                    </label>
                    <input
                      type="text"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      placeholder="e.g., AI in Healthcare, Digital Transformation Strategy, etc."
                      className="input-field"
                      required
                    />
                  </div>

                  {/* Presentation Type */}
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Presentation Type
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {presentationTypes.map((type) => (
                        <div
                          key={type.value}
                          onClick={() => setFormData(prev => ({ ...prev, presentationType: type.value }))}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex flex-col items-center ${
                            formData.presentationType === type.value
                              ? 'bg-white/20 border-2 border-blue-500'
                              : 'bg-white/10 border border-white/20 hover:bg-white/15'
                          }`}
                        >
                          <div className="text-white mb-2">{type.icon}</div>
                          <span className="text-white text-xs text-center">{type.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audience */}
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {audienceOptions.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setFormData(prev => ({ ...prev, audience: option.value }))}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center ${
                            formData.audience === option.value
                              ? 'bg-white/20 border-2 border-blue-500'
                              : 'bg-white/10 border border-white/20 hover:bg-white/15'
                          }`}
                        >
                          <div className="text-white mr-3">{option.icon}</div>
                          <span className="text-white text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Presentation Style
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {styleOptions.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setFormData(prev => ({ ...prev, style: option.value }))}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center ${
                            formData.style === option.value
                              ? 'bg-white/20 border-2 border-blue-500'
                              : 'bg-white/10 border border-white/20 hover:bg-white/15'
                          }`}
                        >
                          <div className="text-white mr-3">{option.icon}</div>
                          <span className="text-white text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Number of Slides */}
                  <div>
                    <label className="block text-white font-medium mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Number of Slides
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        name="slides"
                        value={formData.slides}
                        onChange={handleInputChange}
                        min="5"
                        max="25"
                        className="flex-1"
                      />
                      <span className="text-white font-semibold min-w-[3rem] text-center">
                        {formData.slides}
                      </span>
                    </div>
                  </div>

                  {/* Advanced Options Toggle */}
                  <div>
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="flex items-center text-white/80 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Advanced Options
                      {showAdvancedOptions ? <Minus className="w-4 h-4 ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
                    </button>
                  </div>

                  {/* Additional Info */}
                  {showAdvancedOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-white font-medium mb-2 flex items-center">
                          <Edit3 className="w-4 h-4 mr-2" />
                          Additional Context (Optional)
                        </label>
                        <textarea
                          name="additionalInfo"
                          value={formData.additionalInfo}
                          onChange={handleInputChange}
                          placeholder="Any specific requirements, key points to include, or additional context..."
                          rows="3"
                          className="input-field resize-none"
                        />
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={generateContent}
                    disabled={isGenerating || !formData.topic.trim()}
                    className="btn-primary w-full flex items-center justify-center text-lg py-4"
                  >
                    {isGenerating ? (
                      <>
                        <div className="loading-spinner mr-3"></div>
                        {generationMode === 'canva' ? 'Canva is Generating Content...' : 'AI is Generating Content...'}
                      </>
                    ) : (
                      <>
                        {generationMode === 'canva' ? (
                          <Palette className="w-6 h-6 mr-3" />
                        ) : (
                          <Brain className="w-6 h-6 mr-3" />
                        )}
                        Generate with {generationMode === 'canva' ? 'Canva' : 'AI'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Generating */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="card text-center"
            >
              <div className="flex flex-col items-center space-y-8">
                <div className="relative">
                  <div className="loading-spinner w-20 h-20"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    {generationMode === 'canva' ? 'Canva is Creating Your Presentation' : 'AI is Creating Your Presentation'}
                  </h2>
                  <p className="text-white/80 text-lg max-w-md leading-relaxed">
                    {generationMode === 'canva' 
                      ? 'Our Canva integration is creating a professional presentation with high-quality design elements...'
                      : 'Our advanced AI models are analyzing your topic and generating professional content...'
                    }
                  </p>
                </div>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                
                {/* Progress indicators */}
                <div className="w-full max-w-md">
                  {generationMode === 'canva' ? (
                    <>
                      <div className="flex justify-between text-white/60 text-sm mb-2">
                        <span>Analyzing topic and requirements...</span>
                        <span>✓</span>
                      </div>
                      <div className="flex justify-between text-white/60 text-sm mb-2">
                        <span>Creating Canva presentation...</span>
                        <span className="animate-pulse">⟳</span>
                      </div>
                      <div className="flex justify-between text-white/60 text-sm">
                        <span>Exporting to PowerPoint format...</span>
                        <span>⏳</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-white/60 text-sm mb-2">
                        <span>Analyzing topic with AI...</span>
                        <span>✓</span>
                      </div>
                      <div className="flex justify-between text-white/60 text-sm mb-2">
                        <span>Generating content with {formData.aiModel}...</span>
                        <span className="animate-pulse">⟳</span>
                      </div>
                      <div className="flex justify-between text-white/60 text-sm">
                        <span>Applying AI template design...</span>
                        <span>⏳</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generated Content */}
          {currentStep === 3 && generatedContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Success Message */}
              <div className="card text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <CheckCircle className="w-16 h-16 text-green-400" />
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  {generationMode === 'canva' ? 'Canva PowerPoint Generated!' : 'AI PowerPoint Generated!'}
                </h2>
                <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
                  Your {generationMode === 'canva' ? 'Canva-generated' : 'AI-generated'} PowerPoint presentation has been created and downloaded automatically. The file is now ready for use.
                </p>
                <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-200 text-sm">
                    💡 <strong>Direct File Generation:</strong> The {generationMode === 'canva' ? 'Canva integration' : 'AI model'} directly generates and returns a PowerPoint file (.pptx) with professional formatting and design.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={resetForm}
                  className="btn-primary flex-1 flex items-center justify-center text-lg py-4"
                >
                  <RotateCcw className="w-6 h-6 mr-3" />
                  Create New Presentation
                </button>
                
                <button
                  onClick={() => setCurrentStep(1)}
                  className="btn-secondary flex items-center justify-center text-lg py-4"
                >
                  <ArrowLeft className="w-6 h-6 mr-3" />
                  Back to Form
                </button>
              </div>

              {/* Additional Actions */}
              <div className="flex justify-center space-x-6">
                <button className="flex items-center text-white/60 hover:text-white transition-colors">
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </button>
                <button className="flex items-center text-white/60 hover:text-white transition-colors">
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </button>
                <button className="flex items-center text-white/60 hover:text-white transition-colors">
                  <Play className="w-5 h-5 mr-2" />
                  Present
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-white/60">
        <div className="flex justify-center items-center space-x-4 mb-4">
          <div className="flex items-center">
            <Brain className="w-4 h-4 mr-1 text-blue-400" />
            <span>Powered by Advanced AI</span>
          </div>
          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
          <div className="flex items-center">
            <Crown className="w-4 h-4 mr-1 text-purple-400" />
            <span>Professional Templates</span>
          </div>
          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
          <div className="flex items-center">
            <Rocket className="w-4 h-4 mr-1 text-green-400" />
            <span>Instant Generation</span>
          </div>
        </div>
        <p>AI Presentation Pro • Advanced AI-powered presentation generation</p>
      </footer>
    </div>
  );
}

export default App;
