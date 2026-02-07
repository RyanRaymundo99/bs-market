"use client";
import { Eye, EyeOff } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Control, FieldValues, Path } from "react-hook-form";

// Generic type for InputFieldProps
// Default to FieldValues if not specified

type InputFieldProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  type: "email" | "password" | "text";
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  labelPosition?: "top" | "bottom";
};

export function InputField<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  placeholder,
  type,
  icon,
  showPasswordToggle = false,
  labelPosition = "bottom",
}: InputFieldProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {labelPosition === "top" && (
            <FormLabel className="text-foreground font-medium mb-2 block">
              {label}
            </FormLabel>
          )}
          <FormControl>
            <div className="relative">
              {icon && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div
                    className={`transition-colors duration-200 ${
                      isTyping ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {icon}
                  </div>
                </span>
              )}
              <Input
                {...field}
                type={
                  type === "password"
                    ? showPassword
                      ? "text"
                      : "password"
                    : type
                }
                placeholder={placeholder}
                className={`pl-10 pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-2 ${
                  showPasswordToggle ? "pr-12" : ""
                }`}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                onChange={(e) => {
                  field.onChange(e);
                  setIsTyping(e.target.value.length > 0);
                }}
              />

              {showPasswordToggle && type === "password" && (
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded hover:bg-muted"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </FormControl>
          {labelPosition === "bottom" && (
            <FormLabel className="text-foreground font-medium mt-2 block">
              {label}
            </FormLabel>
          )}
          <FormMessage className="text-destructive" />
        </FormItem>
      )}
    />
  );
}

// CheckboxField for boolean fields

type CheckboxFieldProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
};

export function CheckboxField<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
}: CheckboxFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-input"
            />
          </FormControl>
          <FormLabel className="font-normal text-foreground">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
