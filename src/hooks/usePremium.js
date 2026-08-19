import { useCallback, useMemo, useState } from "react";
import { useAppData } from "../contexts/AppDataContext.jsx";
import * as premium from "../services/premium.js";

export function usePremium() {
  const { state } = useAppData();
  const [sub, setSub] = useState(() => premium.resolveSubscription());
  const [paywall, setPaywall] = useState(null); // { reason }

  const refresh = useCallback(() => setSub(premium.resolveSubscription()), []);

  const isPremium = premium.isPremiumActive(sub);

  /** Bir özelliği kullanmadan önce çağrılır. İzin yoksa nazik bir paywall
   * kartı gösterir (agresif popup değil — madde 67) ve { allowed:false } döner. */
  const guard = useCallback(
    (feature) => {
      const res = premium.checkLimit(feature, sub, state);
      if (!res.allowed) setPaywall({ reason: res.reason });
      return res;
    },
    [sub, state]
  );

  const startTrial = useCallback(() => { setSub(premium.startTrial()); }, []);
  const activate = useCallback((cycle) => { setSub(premium.activatePremium(cycle)); }, []);
  const cancel = useCallback(() => { setSub(premium.cancelPremium()); }, []);

  return useMemo(
    () => ({ sub, isPremium, guard, paywall, closePaywall: () => setPaywall(null), startTrial, activate, cancel, refresh, pricing: premium.PRICING }),
    [sub, isPremium, paywall, guard, startTrial, activate, cancel, refresh]
  );
}
