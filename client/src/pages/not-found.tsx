import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-display font-bold text-foreground tracking-wider">404 // NOT_FOUND</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground font-mono">
            The requested resource does not exist on this server.
          </p>

          <Link href="/">
            <Button variant="outline" className="mt-6 w-full border-primary/30 text-primary hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              RETURN TO SCANNER
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
