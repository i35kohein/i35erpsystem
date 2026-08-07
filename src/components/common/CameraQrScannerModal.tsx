import React, { useEffect, useRef, useState } from 'react';
import { Button , Input } from '../ui';
import {X, 
  Camera, 
  QrCode, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  ArrowRight,
  Volume2,
  VolumeX,
  FileCode} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CameraQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
  title?: string;
  subtitle?: string;
}

const SAMPLE_BARCODES = [
  { label: 'iPhone 15 Pro Max Serial', value: '35892110284915P', type: 'Device IMEI/Serial' },
  { label: 'MacBook Pro M2 Serial', value: 'C02M2MAX2023A27', type: 'Mac Serial' },
  { label: 'OLED Display Part QR', value: 'PART-A2849-OLED-01', type: 'Inventory Part SKU' },
  { label: 'Work Order Ticket QR', value: 'WO-9842', type: 'Repair Ticket Tag' },
];

export const CameraQrScannerModal: React.FC<CameraQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Camera QR & Barcode Scanner',
  subtitle = 'Scan device IMEI, serial tags, work order QR codes, or inventory part labels',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'reader-qr-viewfinder';

  // Play audio beep synthesized with Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  };

  // Fetch available cameras
  useEffect(() => {
    if (!isOpen) return;

    // ESC closes the scanner modal
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escHandler);

    Html5Qrcode.getCameras()
      .then((deviceList) => {
        if (deviceList && deviceList.length > 0) {
          setCameras(deviceList);
          // Prefer environment (rear) camera if available
          const rearCam = deviceList.find(
            (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(rearCam ? rearCam.id : deviceList[0].id);
        } else {
          setErrorMsg('No camera hardware detected. You can upload barcode images or use quick presets.');
        }
      })
      .catch((err) => {
        console.warn('Camera access warning:', err);
        setErrorMsg('Camera permission not granted or device video input unavailable.');
      });

    return () => {
      window.removeEventListener('keydown', escHandler);
      stopScanner();
    };
  }, [isOpen]);

  // Start Camera Stream when camera ID is selected and tab is 'camera'
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera' || !selectedCameraId) return;

    startCameraScanner(selectedCameraId);

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab, selectedCameraId]);

  const startCameraScanner = async (cameraId: string) => {
    setErrorMsg('');
    await stopScanner();

    try {
      const html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleScanFound(decodedText);
        },
        () => {
          // Frame scan error - safe to ignore
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting camera scanner:', err);
      setErrorMsg(err?.message || 'Unable to start camera stream. Please check browser permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing scanner instance:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanFound = (scannedText: string) => {
    playBeep();
    setScannedResult(scannedText);
    // Pause scanning after finding code
    stopScanner();
  };

  // Scan from uploaded file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');
    const imageFile = files[0];

    try {
      const html5Qrcode = new Html5Qrcode('reader-file-temp', false);
      const decodedText = await html5Qrcode.scanFileV2(imageFile, true);
      if (decodedText && decodedText.decodedText) {
        handleScanFound(decodedText.decodedText);
      } else {
        setErrorMsg('No readable QR code or barcode found in this photo.');
      }
    } catch (err: any) {
      setErrorMsg('Could not read barcode from image. Ensure the label is clear and well lit.');
    }
  };

  const handleConfirmResult = () => {
    if (scannedResult) {
      onScanSuccess(scannedResult);
      onClose();
    }
  };

  const handleResetScan = () => {
    setScannedResult(null);
    setErrorMsg('');
    if (selectedCameraId && activeTab === 'camera') {
      startCameraScanner(selectedCameraId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-line rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line bg-surface flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand/10 text-brand-deep rounded-2xl shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ink">{title}</h2>
              <p className="text-xs text-muted">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                soundEnabled ? 'text-brand bg-blue-50' : 'text-muted bg-slate-100'
              }`}
              title={soundEnabled ? 'Beep Audio On' : 'Beep Audio Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 text-muted hover:text-ink hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-line bg-white flex items-center justify-between">
          <div className="flex space-x-2 text-xs font-bold">
            <Button
              onClick={() => {
                setActiveTab('camera');
                setScannedResult(null);
              }}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface text-muted hover:text-ink'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera</span>
            </Button>

            <Button
              onClick={() => {
                stopScanner();
                setActiveTab('upload');
                setScannedResult(null);
              }}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface text-muted hover:text-ink'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </Button>

            <Button
              onClick={() => {
                stopScanner();
                setActiveTab('samples');
                setScannedResult(null);
              }}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface text-muted hover:text-ink'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Test Presets</span>
            </Button>
          </div>

          {/* Camera Selector Dropdown */}
          {activeTab === 'camera' && cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-surface border border-line text-ink text-xs font-semibold px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.substring(0, 5)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: Live Camera Viewfinder */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {/* Scanner Container Box */}
              <div className="relative bg-slate-900 rounded-3xl overflow-hidden min-h-[280px] flex items-center justify-center border-2 border-slate-800 shadow-inner">
                {/* Viewfinder Target Reticle Laser line */}
                {isScanning && !scannedResult && (
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                    <div className="w-64 h-44 border-2 border-brand rounded-2xl relative shadow-lg">
                      {/* Corner brackets */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white rounded-br-lg" />

                      {/* Laser beam */}
                      <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse absolute top-1/2" />
                    </div>
                    <span className="mt-3 text-xs font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                      Align Barcode or QR Code within Frame
                    </span>
                  </div>
                )}

                {/* Html5Qrcode Mount Point */}
                <div id={scannerContainerId} className="w-full h-full text-white" />

                {/* Hidden temp mount for file upload */}
                <div id="reader-file-temp" className="hidden" />
              </div>

              {/* Status Message / Error */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload Photo */}
          {activeTab === 'upload' && (
            <div className="p-8 border-2 border-dashed border-line hover:border-brand rounded-3xl text-center space-y-4 bg-surface transition-all">
              <div className="w-16 h-16 bg-brand/10 text-brand-deep rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-black text-ink">Upload Image or Tag Photo</h3>
                <p className="text-xs text-muted mt-1">Select a PNG, JPG, or WebP photo containing a barcode or QR label</p>
              </div>

              <label className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-2xl shadow-sm cursor-pointer transition-all">
                <FileCode className="w-4 h-4" />
                <span>Choose Image File</span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {errorMsg && (
                <p className="text-rose-600 text-xs font-bold pt-2 flex items-center justify-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>
          )}

          {/* TAB 3: Quick Test Presets */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-muted font-semibold">
                Click any standard Apple repair tag sample to simulate scanning:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_BARCODES.map((sample) => (
                  <Button
                    key={sample.value}
                    onClick={() => handleScanFound(sample.value)}
                    className="p-3 bg-surface hover:bg-brand/10 border border-line hover:border-brand rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <span className="block text-xs font-bold text-brand uppercase">{sample.type}</span>
                    <span className="font-extrabold text-xs text-ink block mt-0.5">{sample.label}</span>
                    <span className="font-mono text-xs text-muted block mt-0.5 group-hover:text-brand">
                      {sample.value}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* SCANNED RESULT DISPLAY BANNER */}
          {scannedResult && (
            <div className="p-4 bg-success/10 border-2 border-success rounded-2xl space-y-3 animate-fadeIn shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-[#28A745] text-white rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-ink">Barcode Decoded Successfully</h4>
                    <p className="text-xs text-emerald-800 font-bold">Ready to auto-fill into Intake / Lookup</p>
                  </div>
                </div>

                <Button
                  onClick={handleResetScan}
                  className="px-2.5 py-1 bg-white border border-success/40 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Rescan</span>
                </Button>
              </div>

              {/* Result Value */}
              <div className="bg-white p-3 rounded-xl border border-success/30 font-mono font-black text-sm text-ink break-all">
                {scannedResult}
              </div>

              {/* Confirm Action */}
              <Button
                onClick={handleConfirmResult}
                className="w-full max-w-md mx-auto py-3 bg-[#28A745] hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28A745]/40 focus-visible:ring-offset-2"
              >
                <span className="truncate">Apply Code to Intake ({scannedResult})</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface flex items-center justify-between">
          <span className="text-xs text-muted font-semibold">
            Formats: QR Code, Code 128, Code 39, EAN, UPC, DataMatrix
          </span>

          <Button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 bg-ink hover:bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Scanner
          </Button>
        </div>
      </div>
    </div>
  );
};
