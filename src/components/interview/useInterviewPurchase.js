import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { authPath } from '../../lib/safeReturnTo.js';
import { createCheckout, loadPathwayOffers } from '../../lib/pathwayCommerce.js';
import { isInterviewProductPurchasable } from '../../config/interviewProducts.js';

function paymentLinkForUser(paymentUrl, user) {
  if (!paymentUrl) return null;
  const url = new URL(paymentUrl);
  if (user?.id) url.searchParams.set('client_reference_id', user.id);
  if (user?.email) url.searchParams.set('prefilled_email', user.email);
  return url.toString();
}

function purchaseReturnTo(location, productId, anchor) {
  const params = new URLSearchParams(location.search);
  params.set('checkout', productId);
  return `${location.pathname}?${params.toString()}#${anchor}`;
}

export default function useInterviewPurchase(product, anchor = 'acquista-sblocco-colloquio') {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offerState, setOfferState] = useState(null);
  const [offersLoading, setOffersLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resumedCheckout = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setOffersLoading(true);
    loadPathwayOffers({ pathway: 'colloquio', accessToken: session?.access_token, signal: controller.signal })
      .then((payload) => {
        if (!active) return;
        setOfferState((payload.offers || []).find((offer) => offer.id === product.offerId) || null);
      })
      .catch((loadError) => {
        if (active && loadError.name !== 'AbortError') setOfferState(null);
      })
      .finally(() => {
        if (active) setOffersLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [product.offerId, session?.access_token]);

  const purchase = useCallback(async () => {
    setError('');
    if (!isInterviewProductPurchasable(product)) {
      setError('Questo prodotto sarà disponibile a breve.');
      return;
    }
    if (!user || !session?.access_token) {
      const returnTo = purchaseReturnTo(location, product.id, anchor);
      navigate(authPath('/login', returnTo), {
        state: { from: returnTo, message: 'Accedi o crea un account per continuare verso il pagamento.' },
      });
      return;
    }

    setLoading(true);
    try {
      if (product.paymentUrl) {
        window.location.assign(paymentLinkForUser(product.paymentUrl, user));
        return;
      }
      if (!product.offerId) throw Object.assign(new Error('Offer not configured'), { code: 'offer_not_configured' });
      const payload = await createCheckout({ offerId: product.offerId, accessToken: session.access_token });
      if (!payload.url) throw new Error('Stripe Checkout non ha restituito un indirizzo valido.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError.code === 'already_owned'
          ? 'Possiedi già questo prodotto.'
          : checkoutError.code === 'offer_not_configured' || checkoutError.code === 'configuration_required'
            ? 'Il checkout sarà disponibile a breve.'
            : 'Non è stato possibile aprire il pagamento. Riprova tra poco.',
      );
      setLoading(false);
    }
  }, [anchor, location, navigate, product, session?.access_token, user]);

  useEffect(() => {
    const pendingId = new URLSearchParams(location.search).get('checkout');
    if (pendingId !== product.id || !user || !session?.access_token || offersLoading || resumedCheckout.current) return;
    resumedCheckout.current = true;
    const params = new URLSearchParams(location.search);
    params.delete('checkout');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '', hash: `#${anchor}` }, { replace: true });
    purchase();
  }, [anchor, location.pathname, location.search, navigate, offersLoading, product.id, purchase, session?.access_token, user]);

  return {
    error,
    loading,
    offersLoading,
    owned: Boolean(offerState?.owned),
    accessUrl: offerState?.accessUrl || '/account',
    available: isInterviewProductPurchasable(product) && Boolean(product.paymentUrl || offerState?.configured),
    purchase,
  };
}
