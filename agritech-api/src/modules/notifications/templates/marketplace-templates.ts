export const marketplaceEmailTemplates = {
  // Order placed (to seller)
  orderPlaced: (data: {
    sellerName: string;
    orderId: string;
    buyerName: string;
    total: number;
    items: Array<{ title: string; quantity: number }>;
  }) => ({
    subject: `Nouvelle commande #${data.orderId.slice(0, 8)} sur AgriTech Market`,
    html: `
      <h1>Nouvelle commande recue !</h1>
      <p>Bonjour ${data.sellerName},</p>
      <p>Vous avez recu une nouvelle commande de <strong>${data.buyerName}</strong>.</p>
      <h2>Details de la commande #${data.orderId.slice(0, 8)}</h2>
      <ul>
        ${data.items.map(item => `<li>${item.quantity}x ${item.title}</li>`).join('')}
      </ul>
      <p><strong>Total: ${data.total.toLocaleString('fr-MA')} MAD</strong></p>
      <p><a href="https://agritech-dashboard.thebzlab.online/marketplace/orders">Gerer la commande</a></p>
    `,
    text: `Nouvelle commande recue de ${data.buyerName}. Total: ${data.total} MAD. Gerez la commande sur: https://agritech-dashboard.thebzlab.online/marketplace/orders`,
  }),

  // Order confirmed (to buyer)
  orderConfirmed: (data: {
    buyerName: string;
    orderId: string;
    sellerName: string;
  }) => ({
    subject: `Votre commande #${data.orderId.slice(0, 8)} est confirmee`,
    html: `
      <h1>Commande confirmee</h1>
      <p>Bonjour ${data.buyerName},</p>
      <p>Votre commande <strong>#${data.orderId.slice(0, 8)}</strong> a ete confirmee par ${data.sellerName}.</p>
      <p>Vous recevrez un email des que votre commande sera expediee.</p>
      <p><a href="https://market.agritech.ma/orders/${data.orderId}">Voir ma commande</a></p>
    `,
    text: `Votre commande #${data.orderId.slice(0, 8)} est confirmee. Voir: https://market.agritech.ma/orders/${data.orderId}`,
  }),

  // Order shipped (to buyer)
  orderShipped: (data: {
    buyerName: string;
    orderId: string;
    sellerName: string;
    trackingNumber?: string;
  }) => ({
    subject: `Votre commande #${data.orderId.slice(0, 8)} est en route`,
    html: `
      <h1>Votre commande est expediee !</h1>
      <p>Bonjour ${data.buyerName},</p>
      <p>Bonne nouvelle ! Votre commande <strong>#${data.orderId.slice(0, 8)}</strong> a ete expediee par ${data.sellerName}.</p>
      ${data.trackingNumber ? `<p>Numero de suivi: <strong>${data.trackingNumber}</strong></p>` : ''}
      <p><a href="https://market.agritech.ma/orders/${data.orderId}">Suivre ma commande</a></p>
    `,
    text: `Votre commande #${data.orderId.slice(0, 8)} est expediee. ${data.trackingNumber ? `Suivi: ${data.trackingNumber}` : ''}`,
  }),

  // Quote request received (to seller)
  quoteRequestReceived: (data: {
    sellerName: string;
    requestId: string;
    buyerName: string;
    productTitle: string;
    quantity: number;
  }) => ({
    subject: `Nouvelle demande de devis - ${data.productTitle}`,
    html: `
      <h1>Nouvelle demande de devis</h1>
      <p>Bonjour ${data.sellerName},</p>
      <p><strong>${data.buyerName}</strong> demande un devis pour:</p>
      <h2>${data.productTitle}</h2>
      <p>Quantite: <strong>${data.quantity}</strong></p>
      <p><a href="https://agritech-dashboard.thebzlab.online/marketplace/quotes">Repondre au devis</a></p>
    `,
    text: `${data.buyerName} demande un devis pour ${data.productTitle}. Repondez sur: https://agritech-dashboard.thebzlab.online/marketplace/quotes`,
  }),

  // Quote responded (to buyer)
  quoteResponded: (data: {
    buyerName: string;
    requestId: string;
    sellerName: string;
    productTitle: string;
    quotedPrice: number;
  }) => ({
    subject: `Devis recu pour ${data.productTitle}`,
    html: `
      <h1>Le vendeur a repondu a votre demande</h1>
      <p>Bonjour ${data.buyerName},</p>
      <p>${data.sellerName} a repondu a votre demande de devis pour <strong>${data.productTitle}</strong>.</p>
      <p><strong>Prix propose: ${data.quotedPrice.toLocaleString('fr-MA')} MAD</strong></p>
      <p><a href="https://market.agritech.ma/quote-requests">Voir le devis</a></p>
    `,
    text: `${data.sellerName} a repondu a votre devis. Prix: ${data.quotedPrice} MAD. Voir: https://market.agritech.ma/quote-requests`,
  }),

  // New review (to seller)
  newReview: (data: {
    sellerName: string;
    reviewerName: string;
    rating: number;
    comment?: string;
  }) => ({
    subject: `Nouvel avis sur votre profil - ${data.rating}/5 etoiles`,
    html: `
      <h1>Nouvel avis client</h1>
      <p>Bonjour ${data.sellerName},</p>
      <p><strong>${data.reviewerName}</strong> a laisse un avis sur votre profil:</p>
      <p>Note: <strong>${data.rating}/5</strong></p>
      ${data.comment ? `<p>"${data.comment}"</p>` : ''}
      <p><a href="https://market.agritech.ma/dashboard">Voir mon profil</a></p>
    `,
    text: `${data.reviewerName} vous a note ${data.rating}/5. ${data.comment || ''}`,
  }),
};
