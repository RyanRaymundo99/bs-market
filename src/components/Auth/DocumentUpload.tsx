"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  FileImage,
} from "lucide-react";
import { CPFField } from "@/components/Auth/CPFField";

interface DocumentUploadProps {
  onComplete: (data: {
    documentType: string;
    documentNumber: string;
    cpf: string;
    documentFront?: File;
    documentBack?: File;
    documentSelfie?: File;
    // CNPJ documents
    contratoSocial?: File;
    cartaoCNPJ?: File;
    cnhSocioControlado?: File;
  }) => void;
  onBack: () => void;
  loading?: boolean;
  userDocument?: string; // CPF or CNPJ to determine document type
}

interface UploadedFile {
  file: File;
  preview: string;
  type: "front" | "back" | "selfie" | "contratoSocial" | "cartaoCNPJ" | "cnhSocio";
}

const DocumentUpload = ({
  onComplete,
  onBack,
  loading = false,
  userDocument = "",
}: DocumentUploadProps) => {
  // Detect if user is CNPJ (14 digits) or CPF (11 digits)
  const cleanDocument = userDocument.replace(/\D/g, "");
  const isCNPJ = cleanDocument.length === 14;
  
  const [documentType, setDocumentType] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState<string>("");
  const [cpf, setCpf] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState<string | null>(null);
  
  // CNPJ specific files
  const [contratoSocial, setContratoSocial] = useState<File | null>(null);
  const [cartaoCNPJ, setCartaoCNPJ] = useState<File | null>(null);
  const [cnhSocio, setCnhSocio] = useState<File | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const handleFileUpload = (file: File, type: "front" | "back" | "selfie" | "contratoSocial" | "cartaoCNPJ" | "cnhSocio") => {
    if (!file) return;

    // For CNPJ documents, accept PDFs or images; for CPF documents, accept images
    const isPDF = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    
    if (!isPDF && !isImage) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: isCNPJ 
          ? "Please upload a PDF file or image (JPG, PNG, etc.)" 
          : "Please upload an image file (JPG, PNG, etc.)",
      });
      return;
    }

    // Validate file size (max 10MB for PDFs, 5MB for images)
    const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: isPDF 
          ? "Please upload a PDF smaller than 10MB" 
          : "Please upload an image smaller than 5MB",
      });
      return;
    }

    // For PDFs, we can't create image preview
    const preview = isPDF ? "" : URL.createObjectURL(file);

    // Handle CNPJ specific files
    if (type === "contratoSocial") {
      setContratoSocial(file);
      return;
    }
    if (type === "cartaoCNPJ") {
      setCartaoCNPJ(file);
      return;
    }
    if (type === "cnhSocio") {
      setCnhSocio(file);
      return;
    }

    // Remove existing file of same type
    setUploadedFiles((prev) => prev.filter((f) => f.type !== type));

    // Add new file (only for images with preview)
    if (isImage) {
      setUploadedFiles((prev) => [...prev, { file, preview, type }]);
    }
  };

  const handleDrag = (
    e: React.DragEvent,
    type: "front" | "back" | "selfie" | "contratoSocial" | "cartaoCNPJ" | "cnhSocio"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(type);
    } else if (e.type === "dragleave") {
      setDragActive(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    type: "front" | "back" | "selfie" | "contratoSocial" | "cartaoCNPJ" | "cnhSocio"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], type);
    }
  };

  const removeFile = (type: "front" | "back" | "selfie" | "contratoSocial" | "cartaoCNPJ" | "cnhSocio") => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.type === type);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.type !== type);
    });
  };

  const getFileByType = (type: "front" | "back" | "selfie" | "contratoSocial" | "cartaoCNPJ" | "cnhSocio") => {
    return uploadedFiles.find((f) => f.type === type);
  };

  const validateForm = () => {
    if (isCNPJ) {
      // CNPJ validation
      if (!contratoSocial) {
        toast({
          variant: "destructive",
          title: "Contrato Social obrigatório",
          description: "Por favor, envie o Contrato Social (PDF ou foto)",
        });
        return false;
      }
      if (!cartaoCNPJ) {
        toast({
          variant: "destructive",
          title: "Cartão CNPJ obrigatório",
          description: "Por favor, envie o Cartão CNPJ (PDF ou foto)",
        });
        return false;
      }
      if (!cnhSocio) {
        toast({
          variant: "destructive",
          title: "CNH do sócio controlado obrigatória",
          description: "Por favor, envie a CNH do sócio controlado (PDF ou foto)",
        });
        return false;
      }
      return true;
    } else {
      // CPF validation
      if (!documentType) {
        toast({
          variant: "destructive",
          title: "Document type required",
          description: "Please select a document type",
        });
        return false;
      }

      if (!documentNumber.trim()) {
        toast({
          variant: "destructive",
          title: "Document number required",
          description: "Please enter your document number",
        });
        return false;
      }

      if (!cpf.trim()) {
        toast({
          variant: "destructive",
          title: "CPF required",
          description: "Please enter your CPF",
        });
        return false;
      }

      const frontFile = getFileByType("front");
      const backFile = getFileByType("back");
      const selfieFile = getFileByType("selfie");

      if (!frontFile) {
        toast({
          variant: "destructive",
          title: "Document front required",
          description: "Please upload the front of your document",
        });
        return false;
      }

      if (!backFile) {
        toast({
          variant: "destructive",
          title: "Document back required",
          description: "Please upload the back of your document",
        });
        return false;
      }

      if (!selfieFile) {
        toast({
          variant: "destructive",
          title: "Selfie required",
          description: "Please upload a selfie with your document",
        });
        return false;
      }
      return true;
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (isCNPJ) {
      onComplete({
        documentType: "CNPJ",
        documentNumber: "",
        cpf: userDocument,
        contratoSocial: contratoSocial!,
        cartaoCNPJ: cartaoCNPJ!,
        cnhSocioControlado: cnhSocio!,
      });
    } else {
      const frontFile = getFileByType("front")!;
      const backFile = getFileByType("back")!;
      const selfieFile = getFileByType("selfie")!;

      onComplete({
        documentType,
        documentNumber,
        cpf,
        documentFront: frontFile.file,
        documentBack: backFile.file,
        documentSelfie: selfieFile.file,
      });
    }
  };

  const renderUploadArea = (
    type: "front" | "back" | "selfie",
    title: string,
    description: string
  ) => {
    const file = getFileByType(type);
    const isDragActive = dragActive === type;
    const inputRef =
      type === "front"
        ? frontInputRef
        : type === "back"
        ? backInputRef
        : selfieInputRef;

    return (
      <div className="space-y-2">
        <Label className="text-white font-medium">{title}</Label>
        <p className="text-white/70 text-sm">{description}</p>

        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-900/20"
              : file
              ? "border-green-500 bg-green-900/20"
              : "border-gray-600 hover:border-gray-500"
          }`}
          onDragEnter={(e) => handleDrag(e, type)}
          onDragLeave={(e) => handleDrag(e, type)}
          onDragOver={(e) => handleDrag(e, type)}
          onDrop={(e) => handleDrop(e, type)}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] && handleFileUpload(e.target.files[0], type as "front" | "back" | "selfie")
            }
            className="hidden"
          />

          {file ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">File uploaded successfully</span>
              </div>
              <div className="relative">
                <img
                  src={file.preview}
                  alt={title}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => removeFile(type)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-white/70 text-sm">{file.file.name}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                {type === "selfie" ? (
                  <Camera className="w-6 h-6 text-white" />
                ) : (
                  <FileImage className="w-6 h-6 text-white" />
                )}
              </div>
              <p className="text-white/80 mb-2">
                Drag and drop your image here
              </p>
              <p className="text-white/60 text-sm mb-4">or</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPDFUpload = (
    type: "contratoSocial" | "cartaoCNPJ" | "cnhSocio",
    title: string,
    description: string
  ) => {
    const file = type === "contratoSocial" ? contratoSocial : type === "cartaoCNPJ" ? cartaoCNPJ : cnhSocio;
    const isDragActive = dragActive === type;

    return (
      <div className="space-y-2">
        <Label className="text-white font-medium">{title}</Label>
        <p className="text-white/70 text-sm">{description}</p>
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-900/20"
              : file
              ? "border-green-500 bg-green-900/20"
              : "border-gray-600 hover:border-gray-500"
          }`}
          onDragEnter={(e) => handleDrag(e, type)}
          onDragLeave={(e) => handleDrag(e, type)}
          onDragOver={(e) => handleDrag(e, type)}
          onDrop={(e) => handleDrop(e, type)}
        >
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) =>
              e.target.files?.[0] && handleFileUpload(e.target.files[0], type)
            }
            className="hidden"
            id={`${type}-upload`}
          />
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Arquivo enviado com sucesso</span>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <FileImage className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-white/70 text-sm text-center">{file.name}</p>
                <p className="text-white/50 text-xs text-center mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (type === "contratoSocial") setContratoSocial(null);
                  if (type === "cartaoCNPJ") setCartaoCNPJ(null);
                  if (type === "cnhSocio") setCnhSocio(null);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Remover arquivo
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <FileImage className="w-6 h-6 text-white" />
              </div>
              <p className="text-white/80 mb-2">
                Arraste e solte o arquivo aqui (PDF ou foto)
              </p>
              <p className="text-white/60 text-sm mb-4">ou</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(`${type}-upload`)?.click()}
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Escolher arquivo (PDF ou foto)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-white">
          {isCNPJ ? "Verificação de Documentos CNPJ" : "Document Verification"}
        </CardTitle>
        <p className="text-center text-white/70">
          {isCNPJ
            ? "Por favor, envie os documentos da empresa para verificação"
            : "Please upload your identity document and take a selfie for verification"}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCNPJ ? (
          <>
            {/* CNPJ Documents */}
            {renderPDFUpload(
              "contratoSocial",
              "Contrato Social",
              "Envie o Contrato Social da empresa (PDF ou foto)"
            )}
            {renderPDFUpload(
              "cartaoCNPJ",
              "Cartão CNPJ",
              "Envie o Cartão CNPJ da empresa (PDF ou foto)"
            )}
            {renderPDFUpload(
              "cnhSocio",
              "CNH do Sócio Controlado",
              "Envie a CNH do sócio controlado (PDF ou foto)"
            )}
          </>
        ) : (
          <>
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label className="text-white font-medium">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select your document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RG">RG (Registro Geral)</SelectItem>
                  <SelectItem value="HABILITACAO">
                    Habilitação (Driver&apos;s License)
                  </SelectItem>
                  <SelectItem value="CNH">
                    CNH (Carteira Nacional de Habilitação)
                  </SelectItem>
                  <SelectItem value="PASSPORT">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Number */}
            <div className="space-y-2">
              <Label className="text-white font-medium">Document Number</Label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter your document number"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* CPF Confirmation */}
            <div className="space-y-2">
              <CPFField
                value={cpf}
                onChange={setCpf}
                onBlur={() => {}}
                error=""
                required
                label="Confirm CPF"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Document Upload Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderUploadArea(
                "front",
                "Document Front",
                "Upload the front side of your document"
              )}
              {renderUploadArea(
                "back",
                "Document Back",
                "Upload the back side of your document"
              )}
            </div>

            {/* Selfie Upload */}
            {renderUploadArea(
              "selfie",
              "Selfie with Document",
              "Take a selfie holding your document next to your face"
            )}
          </>
        )}

        {/* Security Notice */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium mb-1 text-white">Security Notice</p>
              <p>
                Your documents are encrypted and stored securely. They will only
                be used for identity verification and will not be shared with
                third parties without your consent.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 border-gray-600 text-white hover:bg-gray-700"
            disabled={loading}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit for Verification"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { DocumentUpload };
export default DocumentUpload;
