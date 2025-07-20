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
            <FormLabel className="text-gray-200 font-medium mb-2 block">
              {label}
            </FormLabel>
          )}
          <FormControl>
            <div className="relative">
              {icon && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <div
                    className={`transition-colors duration-200 ${
                      isTyping ? "text-black" : "text-gray-300"
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
                className={`pl-10 pr-10 bg-black/60 border-gray-800/50 text-white placeholder-gray-400 backdrop-blur-[15px] relative overflow-hidden focus:outline-none focus:ring-0 focus:border-gray-800/50 ${
                  showPasswordToggle ? "pr-16" : ""
                }`}
                style={{
                  boxShadow:
                    "inset 0 2px 4px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                }}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                onChange={(e) => {
                  field.onChange(e);
                  setIsTyping(e.target.value.length > 0);
                }}
              />
              {/* Black glass effect for input */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-gray-900/20 opacity-70 pointer-events-none rounded-md"></div>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>
              <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-gray-700/20 to-transparent"></div>

              {showPasswordToggle && type === "password" && (
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors z-10 bg-black/50 hover:bg-gray-900/60 border border-gray-800/50 hover:border-gray-700/50 rounded-md p-1 backdrop-blur-[10px]"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {/* Black glass effect for button */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-gray-900/20 opacity-60 pointer-events-none rounded-md"></div>
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-700/25 to-transparent"></div>

                  {showPassword ? (
                    <EyeOff className="h-4 w-4 relative z-10" />
                  ) : (
                    <Eye className="h-4 w-4 relative z-10" />
                  )}
                </button>
              )}
            </div>
          </FormControl>
          {labelPosition === "bottom" && (
            <FormLabel className="text-gray-200 font-medium mt-2 block">
              {label}
            </FormLabel>
          )}
          <FormMessage className="text-red-300" />
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
              className="border-gray-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 bg-black/50 backdrop-blur-[5px]"
            />
          </FormControl>
          <FormLabel className="font-normal text-gray-200">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
