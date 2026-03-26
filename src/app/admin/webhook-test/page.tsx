"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface WebhookTestResult {
  success: boolean;
  message: string;
  orderId?: string;
  orderStatus?: string;
  balanceUpdated?: boolean;
  error?: string;
  details?: string;
}

interface OrderInfo {
  id: string;
  externalOrderId: string | null;
  status: string;
  amount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  executedAt: string | null;
  deposit: {
    id: string;
    externalId: string | null;
    status: string;
    confirmedAt: string | null;
  } | null;
}

export default function WebhookTestPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderInfo[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [webhookPayload, setWebhookPayload] = useState<string>("");
  const generateWebhookPayload = useCallback((
    order: OrderInfo,
    eventType: string = "transaction.completed",
    status: string = "COMPLETED"
  ) => {
    // Generate a test webhook payload based on the order
    const now = new Date().toISOString();
    const payload = {
      event: eventType,
      data: {
        transaction_id: order.externalOrderId || `txn_test_${Date.now()}`,
        external_id: order.deposit?.externalId || `purchase_test_${Date.now()}`,
        status: status,
        amount: order.total,
        currency: "BRL",
        type: "PIX",
        usdt_amount: order.amount,
        created_at: order.createdAt,
        completed_at: status === "COMPLETED" ? now : null,
        failed_at: status === "FAILED" ? now : null,
        refunded_at: status === "REFUNDED" ? now : null,
      },
      timestamp: now,
    };
    setWebhookPayload(JSON.stringify(payload, null, 2));
  }, []);


  const fetchRecentOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/debug/webhook-status");
      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        setRecentOrders(orders);
        
        // Auto-select first order if available and none selected
        if (orders.length > 0 && !selectedOrderId) {
          const firstOrder = orders[0];
          setSelectedOrderId(firstOrder.id);
          generateWebhookPayload(firstOrder, "transaction.completed", "COMPLETED");
        }
      } else {
        console.error("Failed to fetch orders:", response.status);
        toast({
          title: "Error",
          description: "Failed to load orders. Make sure you're logged in.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders. Check console for details.",
        variant: "destructive",
      });
    }
  }, [selectedOrderId, generateWebhookPayload, toast]);

  // Load recent orders on mount
  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);


  const quickTest = (eventType: string, status: string) => {
    if (recentOrders.length === 0) {
      toast({
        title: "Error",
        description: "No orders available. Please make a purchase first or refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    // Use selected order, or fallback to first order
    const orderId = selectedOrderId || recentOrders[0].id;
    const order = recentOrders.find((o) => o.id === orderId);
    
    if (!order) {
      // Fallback to first order if selected order not found
      const firstOrder = recentOrders[0];
      setSelectedOrderId(firstOrder.id);
      generateWebhookPayload(firstOrder, eventType, status);
      toast({
        title: "Payload Generated",
        description: `Generated ${eventType} payload with status ${status} (using first order)`,
      });
      return;
    }
    
    // Ensure this order is selected
    if (selectedOrderId !== order.id) {
      setSelectedOrderId(order.id);
    }
    
    generateWebhookPayload(order, eventType, status);
    toast({
      title: "Payload Generated",
      description: `Generated ${eventType} payload with status ${status}`,
    });
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = recentOrders.find((o) => o.id === orderId);
    if (order) {
      generateWebhookPayload(order);
    }
  };

  const testWebhook = async () => {
    if (!webhookPayload) {
      toast({
        title: "Error",
        description: "Please provide a webhook payload",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      // Parse the payload to validate JSON
      const payload = JSON.parse(webhookPayload);

      // Send test webhook to our endpoint
      // Include test header to skip signature verification in development
      const response = await fetch("/api/webhooks/mercadopago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-webhook": "true", // Skip signature verification for testing
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: result.message || "Webhook processed successfully",
          orderId: result.orderId,
          orderStatus: result.orderStatus,
          balanceUpdated: result.balanceUpdated,
        });
        toast({
          title: "✅ Webhook Test Successful",
          description: "Webhook was processed successfully",
        });
        // Refresh orders to see updated status
        setTimeout(() => fetchRecentOrders(), 1000);
      } else {
        setTestResult({
          success: false,
          message: result.error || "Webhook test failed",
          error: result.details || result.error,
        });
        toast({
          title: "❌ Webhook Test Failed",
          description: result.error || "Webhook processing failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid JSON payload";
      setTestResult({
        success: false,
        message: "Error sending webhook",
        error: errorMessage,
      });
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedOrder = recentOrders.find((o) => o.id === selectedOrderId);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Webhook Testing Tool</h1>
          <Button
            onClick={fetchRecentOrders}
            className="bg-card border-border"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Orders
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentOrders.length === 0 ? (
                  <p className="text-muted-foreground">No orders found</p>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleOrderSelect(order.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedOrderId === order.id
                          ? "bg-primary/30 border-primary"
                          : "bg-muted border-border hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-mono text-muted-foreground">
                            {order.id.substring(0, 20)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            External ID: {order.externalOrderId || "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === "COMPLETED"
                                ? "bg-green-900/30 text-green-400 border border-green-800"
                                : order.status === "PENDING"
                                ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                                : "bg-red-900/30 text-red-400 border border-red-800"
                            }`}
                          >
                            {order.status}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            R$ {order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Selected Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedOrder ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="text-sm font-mono text-foreground">
                      {selectedOrder.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">External Order ID</p>
                    <p className="text-sm font-mono text-foreground">
                      {selectedOrder.externalOrderId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrder.status === "COMPLETED"
                          ? "bg-green-900/30 text-green-400 border border-green-800"
                          : selectedOrder.status === "PENDING"
                          ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                          : "bg-red-900/30 text-red-400 border border-red-800"
                      }`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-sm text-foreground">
                      R$ {selectedOrder.total.toFixed(2)} →{" "}
                      {selectedOrder.amount.toFixed(8)} USDT
                    </p>
                  </div>
                  {selectedOrder.deposit && (
                    <div>
                      <p className="text-sm text-muted-foreground">Deposit External ID</p>
                      <p className="text-sm font-mono text-foreground">
                        {selectedOrder.deposit.externalId || "N/A"}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm text-foreground">
                      {new Date(selectedOrder.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Select an order to view details</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Test Options */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Test Options</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Quickly generate test payloads for common webhook events. Select an order first, then click a button to generate the payload.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => quickTest("transaction.completed", "COMPLETED")}
                disabled={recentOrders.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Transaction Completed
              </Button>
              <Button
                onClick={() => quickTest("transaction.created", "PENDING")}
                disabled={recentOrders.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transaction Created
              </Button>
              <Button
                onClick={() => quickTest("transaction.failed", "FAILED")}
                disabled={recentOrders.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Transaction Failed
              </Button>
              <Button
                onClick={() => quickTest("transaction.refunded", "REFUNDED")}
                disabled={recentOrders.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transaction Refunded
              </Button>
              <Button
                onClick={() => quickTest("payment.completed", "COMPLETED")}
                disabled={recentOrders.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Payment Completed
              </Button>
              <Button
                onClick={() => quickTest("payment.created", "PENDING")}
                disabled={recentOrders.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Payment Created
              </Button>
              <Button
                onClick={() => quickTest("payment.failed", "FAILED")}
                disabled={recentOrders.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Payment Failed
              </Button>
              <Button
                onClick={() => quickTest("payment.refunded", "REFUNDED")}
                disabled={recentOrders.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Payment Refunded
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Payload Editor */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Webhook Payload</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Edit the payload below to test different webhook scenarios. The
              payload will be sent to /api/webhooks/mercadopago
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={webhookPayload}
              onChange={(e) => setWebhookPayload(e.target.value)}
              className="w-full h-64 p-4 bg-muted border border-border rounded-lg text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder='{"event": "transaction.completed", "data": {...}}'
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={testWebhook}
                disabled={loading || !webhookPayload}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Webhook
                  </>
                )}
              </Button>
              {selectedOrderId && (
                <Button
                  onClick={() => {
                    const order = recentOrders.find((o) => o.id === selectedOrderId);
                    if (order) {
                      generateWebhookPayload(order, "transaction.completed", "COMPLETED");
                    }
                  }}
                  className="bg-muted border-border"
                >
                  Regenerate Payload
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Result */}
        {testResult && (
          <Card
            className={`border-2 ${
              testResult.success
                ? "bg-green-900/20 border-green-600"
                : "bg-red-900/20 border-red-600"
            }`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                Test Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Message</p>
                  <p className="text-foreground">{testResult.message}</p>
                </div>
                {testResult.orderId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="text-sm font-mono text-foreground">
                      {testResult.orderId}
                    </p>
                  </div>
                )}
                {testResult.orderStatus && (
                  <div>
                    <p className="text-sm text-muted-foreground">Order Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        testResult.orderStatus === "COMPLETED"
                          ? "bg-green-900/30 text-green-400 border border-green-800"
                          : "bg-yellow-900/30 text-yellow-400 border border-yellow-800"
                      }`}
                    >
                      {testResult.orderStatus}
                    </span>
                  </div>
                )}
                {testResult.balanceUpdated !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Balance Updated</p>
                    <p className="text-foreground">
                      {testResult.balanceUpdated ? "Yes" : "No"}
                    </p>
                  </div>
                )}
                {testResult.error && (
                  <div>
                    <p className="text-sm text-muted-foreground">Error</p>
                    <p className="text-red-400">{testResult.error}</p>
                  </div>
                )}
                {testResult.details && (
                  <div>
                    <p className="text-sm text-muted-foreground">Details</p>
                    <p className="text-sm text-muted-foreground">{testResult.details}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-primary/20 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertCircle className="w-5 h-5 text-primary" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • This tool sends test webhooks to your webhook endpoint. Make
              sure your server is running.
            </p>
            <p>
              • Webhook signature verification will fail for test payloads
              (this is expected). The webhook handler will reject unsigned
              webhooks in production.
            </p>
            <p>
              • Check your server logs to see detailed webhook processing
              information.
            </p>
            <p>
              • The payload is auto-generated based on the selected order, but
              you can edit it to test different scenarios.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

