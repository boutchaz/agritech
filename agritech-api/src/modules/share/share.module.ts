import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { OrganizationEmailSettingsModule } from '../organization-email-settings/organization-email-settings.module';
import { OrganizationWhatsAppSettingsModule } from '../organization-whatsapp-settings/organization-whatsapp-settings.module';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { DocumentPdfService } from './pdf/document-pdf.service';
import { SHAREABLE_RESOLVERS } from './types';
import { InvoiceShareableResolver } from './resolvers/invoice.resolver';
import { QuoteShareableResolver } from './resolvers/quote.resolver';
import { SalesOrderShareableResolver } from './resolvers/sales-order.resolver';
import { PurchaseOrderShareableResolver } from './resolvers/purchase-order.resolver';
import { DeliveryShareableResolver } from './resolvers/delivery.resolver';
import { PaymentShareableResolver } from './resolvers/payment.resolver';

const RESOLVERS = [
  InvoiceShareableResolver,
  QuoteShareableResolver,
  SalesOrderShareableResolver,
  PurchaseOrderShareableResolver,
  DeliveryShareableResolver,
  PaymentShareableResolver,
];

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    OrganizationEmailSettingsModule,
    OrganizationWhatsAppSettingsModule,
  ],
  controllers: [ShareController],
  providers: [
    ShareService,
    DocumentPdfService,
    ...RESOLVERS,
    {
      provide: SHAREABLE_RESOLVERS,
      useFactory: (...resolvers: any[]) => resolvers,
      inject: RESOLVERS,
    },
  ],
  exports: [ShareService],
})
export class ShareModule {}
