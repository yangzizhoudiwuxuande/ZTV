import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crown, Check, Sparkles, Loader2 } from 'lucide-react';
import { createPaymentOrder, getOrderByNo, isMembershipActive } from '@/db/api';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import type { SubscriptionPlan } from '@/types';

const plans = [
  {
    id: 'monthly' as SubscriptionPlan,
    skuCode: 'membership_monthly',
    name: 'Monthly Plan',
    price: 7,
    period: 'month',
    features: [
      'Ad-free experience',
      'HD video quality',
      'Priority support',
      'Early access to new features'
    ]
  },
  {
    id: 'yearly' as SubscriptionPlan,
    skuCode: 'membership_yearly',
    name: 'Yearly Plan',
    price: 72,
    period: 'year',
    savings: 'Save ¥12',
    features: [
      'Ad-free experience',
      'HD video quality',
      'Priority support',
      'Early access to new features',
      'Exclusive badges'
    ]
  }
];

export function MembershipCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<{ order_no: string; code_url: string } | null>(null);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'paid' | 'cancelled'>('pending');

  const isPremium = profile && isMembershipActive(profile);

  // Poll order status
  useEffect(() => {
    let intervalId: number;
    if (payDialogOpen && currentOrder && orderStatus === 'pending') {
      intervalId = window.setInterval(async () => {
        try {
          const order = await getOrderByNo(currentOrder.order_no);
          if (order && order.status === 'paid') {
            setOrderStatus('paid');
            toast.success('Payment successful! Premium activated.');
            await refreshProfile();
            setTimeout(() => {
              setPayDialogOpen(false);
              setDialogOpen(false);
            }, 2000);
          }
        } catch (error) {
          console.error('Failed to query order status:', error);
        }
      }, 2000);
    }
    return () => clearInterval(intervalId);
  }, [payDialogOpen, currentOrder, orderStatus]);

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = await createPaymentOrder(plan.skuCode, user.id, plan.id);
      setCurrentOrder(orderData);
      setOrderStatus('pending');
      setPayDialogOpen(true);
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast.error(error.message || 'Failed to create order. Please check WeChat Pay configuration.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle>Premium Benefits</CardTitle>
          </div>
          {isPremium && (
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
        <CardDescription>
          {isPremium
            ? `Your Premium membership is active until ${new Date(profile.membership_expires_at!).toLocaleDateString()}`
            : 'Unlock premium features for the best viewing experience'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPremium && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-primary" />
                  Choose Your Subscription
                </DialogTitle>
                <DialogDescription>
                  Select a plan that works for you. Cancel anytime.
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                    {plan.savings && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary" className="bg-primary text-primary-foreground">
                          {plan.savings}
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">¥{plan.price}</span>
                        <span className="text-muted-foreground">/{plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(plan)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : `Subscribe ${plan.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* WeChat Pay Dialog */}
        <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">WeChat Pay</DialogTitle>
              <DialogDescription className="text-center">
                Please scan the QR code with WeChat to pay
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
              {currentOrder?.code_url ? (
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <QRCodeDataUrl text={currentOrder.code_url} width={200} />
                </div>
              ) : (
                <div className="h-[200px] w-[200px] flex items-center justify-center bg-muted rounded-lg">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}
              
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-primary">
                  {orderStatus === 'paid' ? 'Paid Successfully!' : 'Waiting for payment...'}
                </p>
                {currentOrder && (
                  <p className="text-xs text-muted-foreground">
                    Order No: {currentOrder.order_no}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isPremium && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Ad-free experience</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>4K Ultra HD</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Priority Support</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
