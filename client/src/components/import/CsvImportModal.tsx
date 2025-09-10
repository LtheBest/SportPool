import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFeatures, AVAILABLE_FEATURES } from "@/hooks/useFeatures";
import { apiRequest } from "@/lib/queryClient";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (emails: string[]) => void;
}

interface ParsedEmail {
  email: string;
  name?: string;
  isValid: boolean;
  error?: string;
}

export function CsvImportModal({ isOpen, onClose, onImportComplete }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasFeature } = useFeatures();
  const { toast } = useToast();

  // Vérifier les permissions
  if (!hasFeature(AVAILABLE_FEATURES.CSV_IMPORT)) {
    return null;
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseCSVContent = (content: string): ParsedEmail[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const emails: ParsedEmail[] = [];
    
    lines.forEach((line, index) => {
      // Supporter plusieurs formats CSV
      const cells = line.split(/[,;\t]/).map(cell => cell.trim().replace(/['"]/g, ''));
      
      // Essayer de détecter l'email dans la ligne
      let email = '';
      let name = '';
      
      // Format: email seul
      if (cells.length === 1) {
        email = cells[0];
      }
      // Format: nom, email ou email, nom
      else if (cells.length >= 2) {
        // Détecter quelle colonne contient l'email
        const emailIndex = cells.findIndex(cell => validateEmail(cell));
        if (emailIndex !== -1) {
          email = cells[emailIndex];
          name = cells[emailIndex === 0 ? 1 : 0];
        } else {
          // Essayer le premier champ comme email
          email = cells[0];
          name = cells[1];
        }
      }
      
      if (email) {
        const isValid = validateEmail(email);
        emails.push({
          email: email.toLowerCase(),
          name: name || undefined,
          isValid,
          error: !isValid ? 'Format d\'email invalide' : undefined
        });
      }
    });
    
    return emails;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Vérifier le type de fichier
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx?|txt)$/i)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner un fichier CSV, Excel ou TXT.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      let content = '';
      
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/plain') {
        // Lire fichier CSV/TXT
        content = await selectedFile.text();
      } else {
        // Pour les fichiers Excel, on va utiliser une API côté serveur
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await apiRequest('POST', '/api/import/parse-excel', formData, {
          'Content-Type': undefined // Laisser le navigateur définir le Content-Type pour FormData
        });
        
        content = response.content;
      }

      const parsed = parseCSVContent(content);
      setParsedEmails(parsed);
      setStep('preview');
      
      toast({
        title: "Fichier analysé",
        description: `${parsed.length} adresses trouvées, ${parsed.filter(p => p.isValid).length} valides.`,
      });
      
    } catch (error) {
      console.error('Erreur lors de l\'analyse du fichier:', error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser le fichier. Vérifiez le format.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    const validEmails = parsedEmails.filter(p => p.isValid).map(p => p.email);
    
    if (validEmails.length === 0) {
      toast({
        title: "Aucun email valide",
        description: "Aucune adresse email valide trouvée dans le fichier.",
        variant: "destructive",
      });
      return;
    }

    onImportComplete(validEmails);
    setStep('complete');
    
    toast({
      title: "Import réussi",
      description: `${validEmails.length} adresses email importées avec succès.`,
    });
  };

  const handleClose = () => {
    setFile(null);
    setParsedEmails([]);
    setStep('upload');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Import CSV/Excel</h2>
            <p className="text-sm text-muted-foreground">
              Importez des listes d'adresses email depuis vos fichiers
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </Button>
        </div>

        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <i className="fas fa-upload mr-2 text-primary"></i>
                  Sélectionner un fichier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <i className="fas fa-file-csv text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-lg font-medium mb-2">
                    Cliquez pour sélectionner un fichier
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Formats supportés: CSV, Excel (.xlsx, .xls), TXT
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-folder-open mr-2"></i>
                        Sélectionner un fichier
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formats supportés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">CSV avec colonnes</h4>
                    <pre className="bg-muted p-3 rounded text-xs">
nom,email{'\n'}
Jean Dupont,jean@email.com{'\n'}
Marie Martin,marie@email.com
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Liste d'emails simples</h4>
                    <pre className="bg-muted p-3 rounded text-xs">
jean@email.com{'\n'}
marie@email.com{'\n'}
pierre@email.com
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Aperçu des données</h3>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <i className="fas fa-arrow-left mr-2"></i>
                  Retour
                </Button>
                <Button onClick={handleImport} disabled={parsedEmails.filter(p => p.isValid).length === 0}>
                  <i className="fas fa-check mr-2"></i>
                  Importer {parsedEmails.filter(p => p.isValid).length} emails
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{parsedEmails.length}</div>
                  <div className="text-sm text-muted-foreground">Total trouvé</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{parsedEmails.filter(p => p.isValid).length}</div>
                  <div className="text-sm text-muted-foreground">Emails valides</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{parsedEmails.filter(p => !p.isValid).length}</div>
                  <div className="text-sm text-muted-foreground">Emails invalides</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-3 font-medium">Nom</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedEmails.map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="p-3">{item.name || '-'}</td>
                          <td className="p-3 font-mono text-sm">{item.email}</td>
                          <td className="p-3">
                            {item.isValid ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">
                                Valide
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">
                                {item.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-check text-2xl text-green-600 dark:text-green-400"></i>
            </div>
            <h3 className="text-xl font-bold">Import réussi !</h3>
            <p className="text-muted-foreground">
              Les adresses email ont été importées avec succès dans votre liste.
            </p>
            <Button onClick={handleClose}>
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}