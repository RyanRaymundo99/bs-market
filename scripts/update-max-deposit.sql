-- Script para atualizar o limite máximo de depósito para 1.000.000 USDT
-- Execute este script no seu banco de dados PostgreSQL

UPDATE "site_settings" 
SET "maxDepositUsdt" = 1000000 
WHERE "id" = 1;

-- Verificar se a atualização foi bem-sucedida
SELECT "id", "maxDepositUsdt", "updatedAt" 
FROM "site_settings" 
WHERE "id" = 1;
