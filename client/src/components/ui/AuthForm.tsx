import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, loginUserSchema, type InsertUser, type LoginUser } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImageIcon, VideoIcon } from "lucide-react";

export function AuthForm() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Free Watermarking Tool</CardTitle>
        <CardDescription className="mt-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg bg-primary/10">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Image Watermarking</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <VideoIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Video Watermarking</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Start watermarking your content for free!
            </p>
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}