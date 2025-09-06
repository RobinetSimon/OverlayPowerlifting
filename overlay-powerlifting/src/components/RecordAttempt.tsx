'use client';
import React from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'framer-motion';

interface RecordAttemptProps {
  visible: boolean;
}

export default function RecordAttempt({ visible }: RecordAttemptProps) {
  // Crée une "valeur de mouvement" pour suivre la rotation du badge
  const rotateY = useMotionValue(0);
  // Crée une valeur transformée qui est toujours l'opposé de la rotation
  const counterRotateY = useTransform(rotateY, (value) => -value);

  return (
    <AnimatePresence>
      {visible && (
        // CONTENEUR 1 : Gère l'apparition et la disparition fluides (du bas de l'écran)
        <motion.div
          // ANIMATION D'ENTRÉE : Vient du bas de l'écran
          initial={{ y: '100%', opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
          // ANIMATION DE SORTIE : Repart vers le bas de l'écran
          exit={{ y: '100%', opacity: 0, scale: 0.9, transition: { duration: 0.5, ease: [0.8, 0, 0.16, 1] } }}
          style={{ perspective: '800px' }}
        >
          {/* CONTENEUR 2 : Gère la rotation 3D continue et sans interruption */}
          <motion.div
            animate={{ rotateY: 360 }} // Fait tourner l'élément
            transition={{
              duration: 4, // Une rotation toutes les 4 secondes
              ease: 'linear',
              repeat: Infinity,
            }}
            style={{
              rotateY, // Lie la rotation à notre valeur de mouvement
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Le corps du badge avec son style */}
            <div
              className="flex items-center justify-center font-bold uppercase text-white shadow-2xl"
              style={{
                width: '200px',
                height: '40px',
                borderRadius: '8px',
                background:
                  'linear-gradient(145deg, #D92121, #A21414)', // Rouge vif et profond
                border: '2px solid rgba(255, 255, 255, 0.5)', // Contour blanc
              }}
            >
              {/* Le texte, qui contre-rote pour rester face à la caméra */}
              <motion.div
                className="text-xl tracking-wider"
                style={{
                  rotateY: counterRotateY, // Applique la contre-rotation
                  transform: 'translateZ(20px)',
                  textShadow: '0px 2px 5px rgba(0,0,0,0.5)',
                }}
              >
                RECORD
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}