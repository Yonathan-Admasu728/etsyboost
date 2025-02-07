import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Tool from "@/pages/tool";

function Router() {
  return (
    <main role="main">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tool" component={Tool} />
        <Route component={NotFound} />
      </Switch>
    </main>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div lang="en" className="min-h-screen">
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;