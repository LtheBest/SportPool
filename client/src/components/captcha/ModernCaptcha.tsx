import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ModernCaptchaProps {
  onVerify: (isVerified: boolean) => void;
  className?: string;
}

type CaptchaType = 'math' | 'image' | 'pattern';

interface MathChallenge {
  question: string;
  answer: number;
}

interface ImageChallenge {
  question: string;
  images: { id: string; src: string; isCorrect: boolean }[];
  correctCount: number;
}

const ModernCaptcha: React.FC<ModernCaptchaProps> = ({ onVerify, className = '' }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [currentType, setCurrentType] = useState<CaptchaType>('math');
  const [mathChallenge, setMathChallenge] = useState<MathChallenge | null>(null);
  const [imageChallenge, setImageChallenge] = useState<ImageChallenge | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Generate math challenge
  const generateMathChallenge = useCallback((): MathChallenge => {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number, question: string;
    
    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 30) + 10;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        question = `${num1} - ${num2}`;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        question = `${num1} × ${num2}`;
        break;
      default:
        num1 = 5;
        num2 = 3;
        answer = 8;
        question = `${num1} + ${num2}`;
    }
    
    return { question, answer };
  }, []);

  // Generate image challenge
  const generateImageChallenge = useCallback((): ImageChallenge => {
    const categories = [
      { name: 'véhicules', correct: ['🚗', '🚌', '🚛', '🏍️'], incorrect: ['🏠', '🌳', '📱', '⚽'] },
      { name: 'sports', correct: ['⚽', '🏀', '🎾', '🏐'], incorrect: ['🍎', '🌙', '📚', '🎵'] },
      { name: 'animaux', correct: ['🐶', '🐱', '🐭', '🐰'], incorrect: ['🌸', '🍕', '💻', '🎭'] }
    ];
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    const correctImages = [...category.correct].sort(() => Math.random() - 0.5).slice(0, 3);
    const incorrectImages = [...category.incorrect].sort(() => Math.random() - 0.5).slice(0, 5);
    
    const allImages = [...correctImages, ...incorrectImages]
      .map((emoji, index) => ({
        id: `img-${index}`,
        src: emoji,
        isCorrect: correctImages.includes(emoji)
      }))
      .sort(() => Math.random() - 0.5);
    
    return {
      question: `Sélectionnez tous les ${category.name}`,
      images: allImages,
      correctCount: correctImages.length
    };
  }, []);

  // Initialize challenge
  useEffect(() => {
    if (currentType === 'math') {
      setMathChallenge(generateMathChallenge());
    } else if (currentType === 'image') {
      setImageChallenge(generateImageChallenge());
    }
    setUserAnswer('');
    setSelectedImages([]);
  }, [currentType, generateMathChallenge, generateImageChallenge]);

  // Handle math verification
  const verifyMathAnswer = () => {
    if (!mathChallenge) return false;
    return parseInt(userAnswer) === mathChallenge.answer;
  };

  // Handle image verification
  const verifyImageAnswer = () => {
    if (!imageChallenge) return false;
    const correctImages = imageChallenge.images
      .filter(img => img.isCorrect)
      .map(img => img.id);
    
    return selectedImages.length === correctImages.length &&
           selectedImages.every(id => correctImages.includes(id));
  };

  // Handle submission
  const handleSubmit = async () => {
    setIsLoading(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let isCorrect = false;
    
    if (currentType === 'math') {
      isCorrect = verifyMathAnswer();
    } else if (currentType === 'image') {
      isCorrect = verifyImageAnswer();
    }
    
    if (isCorrect) {
      setIsVerified(true);
      setShowSuccess(true);
      onVerify(true);
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } else {
      setAttempts(prev => prev + 1);
      
      // Switch challenge type after failed attempts
      if (attempts >= 2) {
        setCurrentType(prev => prev === 'math' ? 'image' : 'math');
        setAttempts(0);
      } else {
        // Generate new challenge of same type
        if (currentType === 'math') {
          setMathChallenge(generateMathChallenge());
        } else {
          setImageChallenge(generateImageChallenge());
        }
      }
      
      setUserAnswer('');
      setSelectedImages([]);
    }
    
    setIsLoading(false);
  };

  // Handle image selection
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  // Reset captcha
  const resetCaptcha = () => {
    setIsVerified(false);
    setShowSuccess(false);
    setAttempts(0);
    setCurrentType('math');
    onVerify(false);
  };

  if (isVerified && showSuccess) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 text-center ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-green-800 font-medium">✅ Vérification réussie</span>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-3 text-center ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-green-800 text-sm">✅ Vérifié</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetCaptcha}
            className="text-green-600 hover:text-green-800 p-1 h-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-gray-800 font-medium">Vérification humaine</span>
        <div className="ml-auto text-xs text-gray-500">
          {attempts > 0 && `Tentative ${attempts + 1}`}
        </div>
      </div>

      {currentType === 'math' && mathChallenge && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-gray-700 mb-2">Résolvez cette équation :</p>
            <div className="text-2xl font-mono font-bold text-blue-600 bg-white rounded-lg py-3 px-4 border">
              {mathChallenge.question} = ?
            </div>
          </div>
          
          <input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Votre réponse"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
      )}

      {currentType === 'image' && imageChallenge && (
        <div className="space-y-3">
          <p className="text-gray-700 text-center">{imageChallenge.question}</p>
          
          <div className="grid grid-cols-4 gap-2">
            {imageChallenge.images.map((image) => (
              <button
                key={image.id}
                onClick={() => toggleImageSelection(image.id)}
                disabled={isLoading}
                className={`aspect-square rounded-lg border-2 text-2xl flex items-center justify-center transition-all ${
                  selectedImages.includes(image.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {image.src}
              </button>
            ))}
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Cliquez sur toutes les images correspondantes
          </p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isLoading || (currentType === 'math' && !userAnswer) || (currentType === 'image' && selectedImages.length === 0)}
        className="w-full mt-4 bg-blue-500 hover:bg-blue-600"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Vérification...</span>
          </div>
        ) : (
          'Vérifier'
        )}
      </Button>

      {attempts > 0 && (
        <p className="text-xs text-amber-600 text-center mt-2">
          ⚠️ Réponse incorrecte. {3 - attempts} tentative(s) restante(s)
        </p>
      )}
    </div>
  );
};

export default ModernCaptcha;