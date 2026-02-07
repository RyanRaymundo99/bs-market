import { z } from "zod";
import { DocumentValidator } from "@/lib/utils/document-validation";

export const signUpSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z
      .string()
      .min(1, { message: "Phone number is required" })
      .refine(
        (phone) => {
          const cleaned = phone.replace(/\D/g, "");
          return cleaned.length >= 10 && cleaned.length <= 13;
        },
        { message: "Please enter a valid phone number (ex: (11) 99999-9999)" }
      ),
    cpf: z
      .string()
      .min(1, { message: "CPF ou CNPJ é obrigatório" })
      .refine(
        (doc) => {
          const clean = doc.replace(/\D/g, "");
          // Must be either 11 digits (CPF) or 14 digits (CNPJ)
          return clean.length === 11 || clean.length === 14;
        },
        { message: "Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)" }
      )
      .refine((doc) => DocumentValidator.isValid(doc), {
        message: "Por favor, insira um CPF ou CNPJ válido",
      }),
    password: z
      .string()
      .min(6, { message: "A senha deve ter no mínimo 6 caracteres" })
      .max(20, { message: "A senha deve ter no máximo 20 caracteres" })
      .refine((pwd) => /[a-z]/.test(pwd), {
        message: "A senha deve conter letras minúsculas",
      })
      .refine((pwd) => /[A-Z]/.test(pwd), {
        message: "A senha deve conter letras maiúsculas",
      })
      .refine((pwd) => /[0-9]/.test(pwd), {
        message: "A senha deve conter pelo menos um número",
      })
      .refine((pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), {
        message: "A senha deve conter pelo menos um caractere especial",
      }),
    confirmPassword: z.string(),
    acceptMarketing: z.boolean().default(false),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Você deve aceitar os termos para criar uma conta",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
