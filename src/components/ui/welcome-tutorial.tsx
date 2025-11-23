"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
  DollarSign,
  CreditCard,
  Banknote,
  Zap,
} from "lucide-react";

interface WelcomeTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export function WelcomeTutorial({
  isOpen,
  onClose,
  userName,
}: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to BS Market! 🎉",
      description: `Hi ${userName}! Welcome to your new crypto trading account. Let's get you started with a quick tour.`,
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-green-600 mb-2">
              Your account is ready to go!
            </h3>
            <p className="text-gray-600">
              You can start exploring the platform right away. Let us show you
              around.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Add Money to Your Account 💰",
      description:
        "Learn how to fund your account to start trading cryptocurrencies.",
      icon: <DollarSign className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center p-4">
              <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h4 className="font-semibold">PIX</h4>
              <p className="text-sm text-gray-600">
                Instant Brazilian PIX transfers
              </p>
            </Card>
          </div>
        </div>
      ),
    },
    {
      title: "Start Trading Crypto 📈",
      description:
        "Discover how to buy and sell cryptocurrencies on our platform.",
      icon: <TrendingUp className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-semibold text-green-600 mb-2">
                Buying Crypto
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Choose from BTC, ETH, USDT</li>
                <li>• Enter amount in BRL</li>
                <li>• Real-time market prices</li>
                <li>• Instant execution</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold text-red-600 mb-2">
                Selling Crypto
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Sell your crypto for BRL</li>
                <li>• Real-time market prices</li>
                <li>• Instant settlement</li>
                <li>• Withdraw to your bank</li>
              </ul>
            </Card>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-2">
              Trading Features:
            </h4>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Real-time price updates</li>
              <li>• Secure trading platform</li>
              <li>• Complete transaction history</li>
              <li>• Portfolio tracking</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Security & Safety 🔒",
      description:
        "Learn about the security measures protecting your account and funds.",
      icon: <Shield className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-semibold text-green-600 mb-2">
                Account Security
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Encrypted passwords</li>
                <li>• Secure session management</li>
                <li>• HTTPS encryption</li>
                <li>• Regular security audits</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold text-blue-600 mb-2">
                Fund Protection
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Segregated user accounts</li>
                <li>• Real-time balance tracking</li>
                <li>• Transaction verification</li>
                <li>• Audit trail for all operations</li>
              </ul>
            </Card>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">
              Best Practices:
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Never share your login credentials</li>
              <li>• Use strong, unique passwords</li>
              <li>• Enable 2FA when available</li>
              <li>• Monitor your account regularly</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set! 🚀",
      description:
        "You now have everything you need to start your crypto trading journey.",
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-green-600 mb-4">
              Ready to Start Trading!
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <Wallet className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Add Funds</p>
              </div>
              <div className="text-center">
                <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Start Trading</p>
              </div>
              <div className="text-center">
                <Users className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Join Community</p>
              </div>
            </div>
            <p className="text-gray-600">
              Your account is fully activated and ready for trading. Start by
              adding some funds and exploring the platform!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const skipTutorial = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {tutorialSteps[currentStep].icon}
            <div>
              <h2 className="text-2xl font-bold">
                {tutorialSteps[currentStep].title}
              </h2>
              <p className="text-gray-600 font-normal">
                {tutorialSteps[currentStep].description}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">{tutorialSteps[currentStep].content}</div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Step {currentStep + 1} of {tutorialSteps.length}
            </Badge>
            <Button variant="ghost" onClick={skipTutorial}>
              Skip Tutorial
            </Button>
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous
              </Button>
            )}
            <Button onClick={nextStep}>
              {currentStep === tutorialSteps.length - 1 ? (
                "Get Started!"
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / tutorialSteps.length) * 100}%`,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
