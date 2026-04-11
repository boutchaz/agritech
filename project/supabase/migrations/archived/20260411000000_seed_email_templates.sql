-- Fix: allow NULL organization_id for global/system templates
-- Production may have NOT NULL constraint from an older migration.
ALTER TABLE email_templates ALTER COLUMN organization_id DROP NOT NULL;

-- Fix RLS policy: ensure global templates (organization_id IS NULL) are readable by everyone.
-- Production may have a policy that only checks is_organization_member() without the NULL escape.
DROP POLICY IF EXISTS "org_access" ON email_templates;
CREATE POLICY "org_access" ON email_templates
  FOR ALL
  USING ((organization_id IS NULL) OR is_organization_member(organization_id));

-- Seed global email templates (organization_id IS NULL)
-- These are system templates accessible to all organizations.
-- Uses ON CONFLICT to be idempotent.

INSERT INTO email_templates (organization_id, name, description, type, category, subject, html_body, text_body, variables, is_system, is_active)
VALUES
  -- ═══════════════════════════════════════════════════════════════
  -- GENERAL
  -- ═══════════════════════════════════════════════════════════════
  (
    NULL,
    'Welcome - Account Created',
    'Sent to new users when their account is created',
    'user_created',
    'general',
    'Welcome to AgriTech - Your Account Details',
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to AgriTech</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#2e7d32}.content{background-color:#fff;padding:20px;border-radius:6px}.button{display:inline-block;padding:12px 30px;background-color:#2e7d32;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.password-box{background-color:#f5f5f5;border:1px solid #ddd;border-radius:5px;padding:15px;margin:20px 0;text-align:center}.password{font-size:18px;font-weight:bold;color:#2e7d32;letter-spacing:2px}.warning{color:#d32f2f;font-size:14px;margin-top:10px}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Welcome to AgroGina!</h2><p>Dear <strong>{{firstName}} {{lastName}}</strong>,</p><p>Your account has been successfully created for <strong>{{organizationName}}</strong>.</p><p>You can now access the platform to manage your agricultural activities.</p><div class="password-box"><p>Your temporary password is:</p><div class="password">{{tempPassword}}</div><p class="warning">Please change your password after your first login for security reasons.</p></div><p style="text-align:center"><a href="{{loginUrl}}" class="button">Login to AgroGina</a></p><p><strong>Login URL:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p><p><strong>Your email:</strong> {{email}}</p><hr style="margin:30px 0;border:none;border-top:1px solid #eee"><p><em>If you have any questions, please contact your organization administrator.</em></p></div><div class="footer"><p>&copy; 2026 AgroGina. All rights reserved.</p></div></div></body></html>',
    E'Welcome to AgroGina!\n\nDear {{firstName}} {{lastName}},\n\nYour account has been created for {{organizationName}}.\nTemporary password: {{tempPassword}}\nLogin: {{loginUrl}}\n\nPlease change your password after first login.',
    '["firstName", "lastName", "email", "tempPassword", "organizationName", "loginUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Password Reset',
    'Sent when a user password is reset by an administrator',
    'password_reset',
    'general',
    'Your Password Has Been Reset',
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Password Reset</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#2e7d32}.content{background-color:#fff;padding:20px;border-radius:6px}.button{display:inline-block;padding:12px 30px;background-color:#2e7d32;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.password-box{background-color:#fff3e0;border:2px solid #ff9800;border-radius:5px;padding:15px;margin:20px 0;text-align:center}.password{font-size:18px;font-weight:bold;color:#e65100;letter-spacing:2px}.warning{color:#d32f2f;font-size:14px;margin-top:10px}.info{background-color:#e3f2fd;border-left:4px solid #2196f3;padding:15px;margin:20px 0}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Password Has Been Reset</h2><p>Dear <strong>{{firstName}}</strong>,</p><p>Your password has been reset by your administrator.</p><div class="password-box"><p>Your new temporary password is:</p><div class="password">{{tempPassword}}</div><p class="warning">This password will expire in 7 days. Please change it as soon as possible.</p></div><div class="info"><strong>Security Notice:</strong> Please log in immediately and change your password. Do not share this password.</div><p style="text-align:center"><a href="{{loginUrl}}" class="button">Login to AgroGina</a></p></div><div class="footer"><p>&copy; 2026 AgroGina. All rights reserved.</p></div></div></body></html>',
    E'Password Reset\n\nDear {{firstName}},\n\nYour password has been reset.\nNew temporary password: {{tempPassword}}\nLogin: {{loginUrl}}\n\nPlease change your password immediately.',
    '["firstName", "tempPassword", "loginUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Test Email',
    'Test email to verify SMTP configuration',
    'test_email',
    'general',
    'Test Email from AgroGina',
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Test Email</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#2e7d32}.content{background-color:#fff;padding:20px;border-radius:6px}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Test Email</h2><p>{{message}}</p><p><strong>Date:</strong> {{date}}</p><p>If you received this email, the email service is working correctly!</p></div><div class="footer"><p>&copy; 2026 AgroGina. All rights reserved.</p></div></div></body></html>',
    E'Test Email\n\n{{message}}\nDate: {{date}}\n\nIf you received this email, the email service is working correctly!',
    '["message", "date"]'::jsonb,
    true,
    true
  ),

  -- ═══════════════════════════════════════════════════════════════
  -- TASK
  -- ═══════════════════════════════════════════════════════════════
  (
    NULL,
    'Task Due Soon',
    'Sent when a task is due tomorrow',
    'task_due_soon',
    'task',
    'Task Due Tomorrow: {{taskTitle}}',
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Task Due Soon</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#16a34a}.content{background-color:#fff;padding:20px;border-radius:6px}.task-box{background-color:#f0fdf4;border-left:4px solid #16a34a;padding:15px;margin:20px 0;border-radius:4px}.task-title{font-size:18px;font-weight:bold;color:#15803d;margin:0 0 10px 0}.task-meta{color:#666;font-size:13px;margin:10px 0}.button{display:inline-block;padding:12px 30px;background-color:#16a34a;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Task Due Tomorrow</h2><p>Hi <strong>{{firstName}}</strong>,</p><p>This is a friendly reminder that the following task is due <strong>tomorrow</strong>:</p><div class="task-box"><div class="task-title">{{taskTitle}}</div><p>{{taskDescription}}</p><div class="task-meta"><strong>Due Date:</strong> {{dueDate}}</div></div><p style="text-align:center"><a href="{{taskUrl}}" class="button">View Task Details</a></p></div><div class="footer"><p>&copy; 2026 AgroGina. All rights reserved.</p></div></div></body></html>',
    E'Task Due Tomorrow\n\nHi {{firstName}},\n\nTask: {{taskTitle}}\nDescription: {{taskDescription}}\nDue Date: {{dueDate}}\n\nView: {{taskUrl}}',
    '["firstName", "taskTitle", "taskDescription", "dueDate", "taskUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Task Due Today',
    'Sent when a task is due today',
    'task_due_today',
    'task',
    'URGENT: Task Due TODAY - {{taskTitle}}',
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Task Due Today</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#f59e0b}.content{background-color:#fff;padding:20px;border-radius:6px}.task-box{background-color:#fffbeb;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:4px}.task-title{font-size:18px;font-weight:bold;color:#d97706;margin:0 0 10px 0}.task-meta{color:#666;font-size:13px;margin:10px 0}.urgent-notice{background-color:#fee2e2;border:2px solid #dc2626;border-radius:5px;padding:15px;margin:20px 0;color:#991b1b;font-weight:bold}.button{display:inline-block;padding:12px 30px;background-color:#f59e0b;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Task Due TODAY</h2><p>Hi <strong>{{firstName}}</strong>,</p><div class="urgent-notice">URGENT: This task is due TODAY!</div><div class="task-box"><div class="task-title">{{taskTitle}}</div><p>{{taskDescription}}</p><div class="task-meta"><strong>Due Date:</strong> {{dueDate}}</div></div><p style="text-align:center"><a href="{{taskUrl}}" class="button">Complete Task Now</a></p></div><div class="footer"><p>&copy; 2026 AgroGina. All rights reserved.</p></div></div></body></html>',
    E'URGENT: Task Due TODAY\n\nHi {{firstName}},\n\nTask: {{taskTitle}}\nDescription: {{taskDescription}}\nDue Date: {{dueDate}}\n\nComplete now: {{taskUrl}}',
    '["firstName", "taskTitle", "taskDescription", "dueDate", "taskUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Task Overdue',
    'Sent when a task is past its due date',
    'task_overdue',
    'task',
    'OVERDUE: {{taskTitle}}',
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Task Overdue</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#dc2626}.content{background-color:#fff;padding:20px;border-radius:6px}.task-box{background-color:#fef2f2;border-left:4px solid #dc2626;padding:15px;margin:20px 0;border-radius:4px}.task-title{font-size:18px;font-weight:bold;color:#991b1b;margin:0 0 10px 0}.task-meta{color:#666;font-size:13px;margin:10px 0}.critical-notice{background-color:#fee2e2;border:2px solid #dc2626;border-radius:5px;padding:15px;margin:20px 0;color:#991b1b;font-weight:bold;font-size:16px}.status-badge{display:inline-block;background-color:#dc2626;color:white;padding:5px 12px;border-radius:4px;font-weight:bold;font-size:12px;margin-top:10px}.button{display:inline-block;padding:12px 30px;background-color:#dc2626;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Task OVERDUE</h2><p>Hi <strong>{{firstName}}</strong>,</p><div class="critical-notice">CRITICAL: This task is now OVERDUE!</div><div class="task-box"><div class="task-title">{{taskTitle}}</div><p>{{taskDescription}}</p><div class="task-meta"><strong>Was Due:</strong> {{dueDate}}</div><div class="status-badge">OVERDUE</div></div><p style="text-align:center"><a href="{{taskUrl}}" class="button">Complete Task Immediately</a></p></div><div class="footer"><p>&copy; 2026 AgroGina. All rights reserved.</p></div></div></body></html>',
    E'OVERDUE Task\n\nHi {{firstName}},\n\nTask: {{taskTitle}}\nDescription: {{taskDescription}}\nWas Due: {{dueDate}}\n\nComplete immediately: {{taskUrl}}',
    '["firstName", "taskTitle", "taskDescription", "dueDate", "taskUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Task Assignment',
    'Sent to a worker when they are assigned a new task',
    'task_assigned',
    'task',
    E'Nouvelle tâche assignée: {{taskTitle}}',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#f59e0b;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Nouvelle Tâche</h1></div><div class="content"><p>Bonjour,</p><p><strong>{{assignerName}}</strong> vous a assigné une nouvelle tâche.</p><div class="info-row"><strong>Tâche:</strong> {{taskTitle}}</div><div class="info-row"><strong>Priorité:</strong> {{priority}}</div><div class="info-row"><strong>Échéance:</strong> {{dueDate}}</div><div style="text-align:center"><a href="{{taskUrl}}" class="button">Voir la tâche</a></div></div><div class="footer"><p>© 2026 AgroGina</p></div></body></html>',
    E'Nouvelle Tâche\n\n{{assignerName}} vous a assigné une nouvelle tâche.\n\nTâche: {{taskTitle}}\nPriorité: {{priority}}\nÉchéance: {{dueDate}}\n\nVoir: {{taskUrl}}',
    '["taskTitle", "taskId", "assignerName", "priority", "dueDate", "taskUrl"]'::jsonb,
    true,
    true
  ),

  -- ═══════════════════════════════════════════════════════════════
  -- REMINDER
  -- ═══════════════════════════════════════════════════════════════
  (
    NULL,
    'Audit Reminder',
    'Sent as a reminder for upcoming compliance audits',
    'audit_reminder',
    'reminder',
    E'Rappel d''Audit - {{certificationType}}',
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Rappel d''Audit</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.container{border:1px solid #ddd;border-radius:8px;padding:30px;background-color:#f9f9f9}.header{text-align:center;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#16a34a}.content{background-color:#fff;padding:20px;border-radius:6px}.audit-box{background-color:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:4px}.audit-title{font-size:18px;font-weight:bold;color:#92400e;margin:0 0 10px 0}.audit-meta{color:#666;font-size:14px;margin:10px 0}.button{display:inline-block;padding:12px 30px;background-color:#16a34a;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0}.checklist{background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:15px;margin:20px 0}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><div class="logo">AgroGina</div></div><div class="content"><h2>Rappel d''Audit</h2><p>Bonjour <strong>{{firstName}}</strong>,</p><p>Ceci est un rappel pour votre prochain audit de certification :</p><div class="audit-box"><div class="audit-title">{{certificationType}}</div><div class="audit-meta"><strong>Numéro:</strong> {{certificationNumber}}<br><strong>Date d''audit:</strong> {{auditDate}}</div></div><div class="checklist"><strong>Liste de vérification :</strong><br>- Documents à jour<br>- Registres de traçabilité complets<br>- Contrôles de conformité effectués<br>- Personnel informé<br>- Non-conformités précédentes résolues</div><p style="text-align:center"><a href="{{dashboardUrl}}" class="button">Voir les Détails</a></p></div><div class="footer"><p>&copy; 2026 AgroGina. Tous droits réservés.</p></div></div></body></html>',
    E'Rappel d''Audit\n\nBonjour {{firstName}},\n\nCertification: {{certificationType}}\nNuméro: {{certificationNumber}}\nDate d''audit: {{auditDate}}\n\nVoir: {{dashboardUrl}}',
    '["firstName", "certificationType", "certificationNumber", "auditDate", "dashboardUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Low Stock Alert',
    'Sent to managers when inventory items fall below minimum stock levels',
    'low_stock_alert',
    'reminder',
    'Alerte stock faible: {{itemName}}',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.alert-box{background:#fef2f2;padding:20px;border-radius:8px;margin:20px 0;border:2px solid #ef4444}.info-row{margin:15px 0;padding:10px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Alerte Stock Faible</h1></div><div class="content"><div class="alert-box"><h2 style="margin:0;color:#dc2626">{{itemName}}</h2></div><div class="info-row"><strong>Stock actuel:</strong> {{currentQuantity}} {{unit}}</div><div class="info-row"><strong>Minimum requis:</strong> {{minimumStock}} {{unit}}</div><div class="info-row"><strong>Manque:</strong> {{shortageQuantity}} {{unit}}</div></div><div class="footer"><p>© 2026 AgroGina</p></div></body></html>',
    E'Alerte Stock Faible\n\n{{itemName}}\nStock actuel: {{currentQuantity}} {{unit}}\nMinimum: {{minimumStock}} {{unit}}\nManque: {{shortageQuantity}} {{unit}}',
    '["itemName", "itemId", "currentQuantity", "minimumStock", "unit", "shortageQuantity"]'::jsonb,
    true,
    true
  ),

  -- ═══════════════════════════════════════════════════════════════
  -- MARKETPLACE
  -- ═══════════════════════════════════════════════════════════════
  (
    NULL,
    'Quote Request Received',
    'Sent to seller when a buyer requests a quote on the marketplace',
    'quote_request_received',
    'marketplace',
    E'Nouvelle demande de devis - {{productTitle}}',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.info-label{font-weight:600;color:#059669;margin-bottom:5px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Nouvelle Demande de Devis</h1></div><div class="content"><p>Bonjour,</p><p>Vous avez reçu une nouvelle demande de devis sur AgroGina Marketplace.</p><div class="info-row"><div class="info-label">Produit:</div><div><strong>{{productTitle}}</strong></div></div><div class="info-row"><div class="info-label">Client:</div><div>{{buyerName}}</div></div><div class="info-row"><div class="info-label">Email:</div><div><a href="mailto:{{buyerEmail}}">{{buyerEmail}}</a></div></div><div style="text-align:center"><a href="{{quoteRequestUrl}}" class="button">Répondre à la demande</a></div></div><div class="footer"><p>© 2026 AgroGina</p></div></body></html>',
    E'Nouvelle Demande de Devis\n\nProduit: {{productTitle}}\nClient: {{buyerName}}\nEmail: {{buyerEmail}}\n\nRépondre: {{quoteRequestUrl}}',
    '["productTitle", "buyerName", "buyerEmail", "buyerPhone", "requestedQuantity", "unitOfMeasure", "message", "quoteRequestUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Quote Response Sent',
    'Sent to buyer when a seller responds to their quote request',
    'quote_response_sent',
    'marketplace',
    E'Réponse à votre demande de devis - {{productTitle}}',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.price-box{background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);padding:20px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #10b981}.price-box .price{font-size:32px;font-weight:700;color:#059669}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Devis Reçu</h1></div><div class="content"><p>Bonjour {{buyerName}},</p><p>{{sellerName}} a répondu à votre demande de devis pour <strong>{{productTitle}}</strong>.</p><div class="info-row"><strong>Produit:</strong> {{productTitle}}</div><div class="price-box"><div style="color:#059669;font-weight:600;margin-bottom:5px">Prix proposé</div><div class="price">{{quotedPrice}} {{currency}}</div></div><div style="text-align:center"><a href="{{quoteRequestUrl}}" class="button">Consulter le devis</a></div></div><div class="footer"><p>© 2026 AgroGina</p></div></body></html>',
    E'Devis Reçu\n\nBonjour {{buyerName}},\n\n{{sellerName}} a répondu pour {{productTitle}}.\nPrix: {{quotedPrice}} {{currency}}\n\nConsulter: {{quoteRequestUrl}}',
    '["buyerName", "sellerName", "productTitle", "quotedPrice", "currency", "quoteRequestUrl"]'::jsonb,
    true,
    true
  ),

  -- ═══════════════════════════════════════════════════════════════
  -- ORDER
  -- ═══════════════════════════════════════════════════════════════
  (
    NULL,
    'Order Confirmed',
    'Sent to buyer when their marketplace order is confirmed',
    'order_confirmed',
    'order',
    E'Commande confirmée #{{orderNumber}} - AgroGina Marketplace',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.order-number{background:#f0fdf4;padding:15px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #10b981}.order-number strong{font-size:20px;color:#059669}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Commande Confirmée!</h1></div><div class="content"><p>Bonjour {{buyerName}},</p><p>Nous avons bien reçu votre commande. Merci!</p><div class="order-number"><strong>Commande #{{orderNumber}}</strong></div><div class="info-row"><strong>Vendeur:</strong> {{sellerName}}</div><div class="info-row"><strong>Total:</strong> {{totalAmount}} {{currency}}</div><div style="text-align:center"><a href="{{orderUrl}}" class="button">Voir ma commande</a></div></div><div class="footer"><p>© 2026 AgroGina Marketplace</p></div></body></html>',
    E'Commande Confirmée!\n\nCommande #{{orderNumber}}\nVendeur: {{sellerName}}\nTotal: {{totalAmount}} {{currency}}\n\nVoir: {{orderUrl}}',
    '["buyerName", "orderNumber", "sellerName", "totalAmount", "currency", "orderUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'New Order to Seller',
    'Sent to seller when a new marketplace order is placed',
    'new_order_to_seller',
    'order',
    E'Nouvelle commande #{{orderNumber}} - AgroGina Marketplace',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#6366f1;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Nouvelle Commande!</h1></div><div class="content"><p><strong>Vous avez reçu une nouvelle commande #{{orderNumber}}</strong></p><p>Client: <strong>{{buyerName}}</strong></p><div class="info-row"><strong>Total:</strong> {{totalAmount}} {{currency}}</div><div class="info-row"><strong>Adresse:</strong><br>{{shippingAddress}}</div><div style="text-align:center"><a href="{{orderUrl}}" class="button">Gérer cette commande</a></div></div><div class="footer"><p>© 2026 AgroGina Marketplace</p></div></body></html>',
    E'Nouvelle Commande!\n\nCommande #{{orderNumber}}\nClient: {{buyerName}}\nTotal: {{totalAmount}} {{currency}}\n\nGérer: {{orderUrl}}',
    '["buyerName", "orderNumber", "sellerName", "totalAmount", "currency", "shippingAddress", "orderUrl"]'::jsonb,
    true,
    true
  ),
  (
    NULL,
    'Order Status Update',
    'Sent to buyer when their order status changes',
    'order_status_update',
    'order',
    E'Commande #{{orderNumber}} {{statusText}} - AgroGina Marketplace',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.status-message{background:#eff6ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #3b82f6}.button{display:inline-block;padding:12px 30px;background:#3b82f6;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Mise à jour de commande</h1></div><div class="content"><p>Bonjour {{buyerName}},</p><div class="status-message"><h2 style="margin:0;color:#3b82f6">Commande #{{orderNumber}}</h2><p style="margin:15px 0 0 0;font-size:16px">{{statusMessage}}</p></div><div style="text-align:center"><a href="{{orderUrl}}" class="button">Voir ma commande</a></div></div><div class="footer"><p>© 2026 AgroGina Marketplace</p></div></body></html>',
    E'Mise à jour de commande\n\nCommande #{{orderNumber}}\n{{statusMessage}}\n\nVoir: {{orderUrl}}',
    '["buyerName", "orderNumber", "status", "statusText", "statusMessage", "orderUrl"]'::jsonb,
    true,
    true
  ),

  -- ═══════════════════════════════════════════════════════════════
  -- INVOICE
  -- ═══════════════════════════════════════════════════════════════
  (
    NULL,
    'Invoice Email',
    'Sent with invoice details to customer or supplier',
    'invoice_email',
    'invoice',
    E'Facture {{invoiceNumber}} - {{organizationName}}',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.invoice-number{background:#f0fdf4;padding:15px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #10b981}.invoice-number strong{font-size:20px;color:#059669}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>{{invoiceTypeLabel}}</h1></div><div class="content"><p>Bonjour {{partyName}},</p><p>{{invoiceIntro}}</p><div class="invoice-number"><strong>Facture #{{invoiceNumber}}</strong></div><div class="info-row"><strong>Date:</strong> {{invoiceDate}}</div><div class="info-row"><strong>Échéance:</strong> {{dueDate}}</div><div class="info-row"><strong>Total TTC:</strong> {{grandTotal}} {{currency}}</div></div><div class="footer"><p>{{organizationName}}<br>Envoyé via AgroGina</p></div></body></html>',
    E'Facture\n\nBonjour {{partyName}},\n\nFacture #{{invoiceNumber}}\nDate: {{invoiceDate}}\nÉchéance: {{dueDate}}\nTotal TTC: {{grandTotal}} {{currency}}\n\n{{organizationName}}\nEnvoyé via AgroGina',
    '["partyName", "invoiceNumber", "invoiceType", "invoiceTypeLabel", "invoiceIntro", "organizationName", "invoiceDate", "dueDate", "subtotal", "taxAmount", "grandTotal", "currency", "invoiceUrl"]'::jsonb,
    true,
    true
  )
ON CONFLICT DO NOTHING;
