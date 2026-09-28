/**
 * The single source of demo data for the wallet API.
 *
 * One dataset feeds both outputs: the Mockoon environment used for local
 * development, and the static JSON the published demo is served from. Nothing
 * here is business logic — it exists only so the screens have something to
 * render before the real API is connected. Every value marked PROVISIONAL in
 * docs/backend-requirements.md is a placeholder awaiting the real contract.
 *
 * The figures are built so the screens actually reconcile:
 *
 *   total     = pending + available
 *   available = every ledger entry summed
 *   each ledger row carries the balance after it, ending at `available`
 */

/** `days` back from today, at a fixed time, as an ISO timestamp. */
function daysAgo(days, hour = 12, minute = 0) {
  const date = new Date(Date.now() - days * 86400000);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/** `days` forward from today, as a plain YYYY-MM-DD date. */
function daysAhead(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Payment methods
//
// PROVISIONAL — invented names and numbers. Four types, because a merchant is
// paid four ways: a bank account, Vodafone Cash, InstaPay, or cash collected
// from a Drivoo branch.
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = [
  {
    id: 'pm1',
    type: 'bank_account',
    label: 'محمود حسن عبد الله',
    /** Only the last four digits are needed to tell two accounts apart. */
    masked_identifier: '••••9382',
    details: { bank_name: 'البنك الأهلي المصري', branch: 'مدينة نصر' },
    is_default: true,
    status: 'active',
    created_at: daysAgo(72),
  },
  {
    id: 'pm2',
    type: 'vodafone_cash',
    label: 'محمود حسن',
    masked_identifier: '••••7841',
    details: {},
    is_default: false,
    status: 'active',
    created_at: daysAgo(40),
  },
  {
    id: 'pm3',
    type: 'instapay',
    label: 'mahmoud.hassan@instapay',
    masked_identifier: 'mah••••@instapay',
    details: {},
    is_default: false,
    // Not yet usable — the screen has to say so rather than let a withdrawal
    // be sent to it.
    status: 'pending_verification',
    created_at: daysAgo(3),
  },
  {
    id: 'pm4',
    type: 'cash',
    label: 'استلام من فرع مدينة نصر',
    masked_identifier: '',
    details: { branch: 'فرع مدينة نصر', address: '١٢ شارع عباس العقاد، مدينة نصر' },
    is_default: false,
    status: 'active',
    created_at: daysAgo(15),
  },
];

/** The branches a cash collection can be assigned to. PROVISIONAL. */
export const CASH_BRANCHES = {
  data: [
    { id: 'br1', label: 'فرع مدينة نصر', address: '١٢ شارع عباس العقاد، مدينة نصر', hours: 'السبت–الخميس ١٠ص–٦م' },
    { id: 'br2', label: 'فرع الإسكندرية', address: '٤٤ طريق الحرية، سموحة', hours: 'السبت–الخميس ١٠ص–٦م' },
    { id: 'br3', label: 'فرع أكتوبر', address: 'المحور المركزي، الحي الأول', hours: 'السبت–الخميس ١٠ص–٦م' },
  ],
};

// ---------------------------------------------------------------------------
// The ledger
//
// Both directions, unlike the old screen which only ever showed money coming
// in: a delivered order credits the wallet, a withdrawal debits it, and so do
// shipping fees and a returned order's shipping cost.
// ---------------------------------------------------------------------------

const ORDER_CODES = [
  'BHK3359755', 'IYR3361196', 'GKZ3362343', 'BPF3363821', 'NIO3363824',
  'RLT3363826', 'LOO3363830', 'GZC3360164', 'EGY3362736', 'QWM3364011',
  'TRF3364198', 'VNB3364402', 'JDH3364510', 'PLS3364633', 'MKX3364781',
];

/** Deterministic, so the demo shows the same figures on every visit. */
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The balance the wallet should end on, and what the balance card reports. */
const AVAILABLE = 26770;
const OPENING = 5000;

/**
 * Builds the ledger.
 *
 * Both directions, unlike the old screen which only ever showed money coming
 * in. The figures are solved rather than written out, so the ledger actually
 * adds up: payouts are sized to land the running balance exactly on
 * `AVAILABLE`, and each withdrawal is placed on a day the wallet could really
 * cover it — a balance cannot go negative.
 */
function buildLedger() {
  const rand = seeded(20260914);

  // What leaves the wallet, and roughly when. Drivoo bills the merchant for
  // more than shipping, and every one of those charges moves the wallet, so
  // every one belongs in the ledger.
  const debits = [
    { day: 44, type: 'shipping_fee', amount: 1850, reference: 'INV-2026-07', reference_type: 'invoice' },
    { day: 14, type: 'shipping_fee', amount: 2100, reference: 'INV-2026-08', reference_type: 'invoice' },
    { day: 44, type: 'confirmation_fee', amount: 640, reference: 'INV-2026-07', reference_type: 'invoice' },
    { day: 14, type: 'confirmation_fee', amount: 720, reference: 'INV-2026-08', reference_type: 'invoice' },
    { day: 44, type: 'storage_fee', amount: 900, reference: 'INV-2026-07', reference_type: 'invoice' },
    { day: 14, type: 'storage_fee', amount: 900, reference: 'INV-2026-08', reference_type: 'invoice' },
    { day: 30, type: 'packaging_fee', amount: 480, reference: 'INV-2026-08', reference_type: 'invoice' },
    { day: 36, type: 'return_shipping', amount: 140, reference: 'GZC3360164', reference_type: 'order' },
    { day: 11, type: 'return_shipping', amount: 140, reference: 'EGY3362736', reference_type: 'order' },
    { day: 21, type: 'other_service', amount: 350, reference: 'SRV-2026-0118', reference_type: 'service' },
    { day: 55, type: 'withdrawal', amount: 16500, reference: '109958', reference_type: 'withdrawal' },
    { day: 39, type: 'withdrawal', amount: 30000, reference: '110185', reference_type: 'withdrawal' },
    { day: 26, type: 'withdrawal', amount: 30000, reference: '110333', reference_type: 'withdrawal' },
    { day: 10, type: 'withdrawal', amount: 38000, reference: '110500', reference_type: 'withdrawal' },
    // The request still in progress. The amount is held the moment it is
    // requested, which is why it is out of the available balance already —
    // otherwise the same money could be requested twice.
    { day: 2, type: 'withdrawal', amount: 20000, reference: '110641', reference_type: 'withdrawal' },
  ];

  // `other_service` goes both ways — a charge for something extra, or a credit
  // back when Drivoo owes the merchant. The sign lives on the amount, not on
  // the type, so the screen needs no special case for it.
  const serviceCredits = [
    { day: 7, type: 'other_service', amount: 300, reference: 'SRV-2026-0143', reference_type: 'service' },
  ];

  const debitTotal = debits.reduce((total, entry) => total + entry.amount, 0);
  const creditAdjustments = serviceCredits.reduce((total, entry) => total + entry.amount, 0);

  // Payouts have to cover the opening balance, everything that left, and what
  // is left over — so their total is solved, not guessed.
  const payoutDays = [];
  for (let day = 59; day >= 1; day -= 1) {
    // Not every day settles an order; roughly four days in five do.
    if (rand() < 0.8) payoutDays.push(day);
  }
  const payoutTotal = AVAILABLE - OPENING + debitTotal - creditAdjustments;

  // Weights give the amounts a believable spread, then scale to the total.
  const weights = payoutDays.map(() => 0.6 + rand() * 1.4);
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  let allocated = 0;
  const payouts = payoutDays.map((day, index) => {
    const isLast = index === payoutDays.length - 1;
    // Rounded to 50, the way an order's goods value falls in practice; the
    // last one absorbs the rounding so the total is exact.
    const amount = isLast
      ? payoutTotal - allocated
      : Math.round((payoutTotal * weights[index]) / weightSum / 50) * 50;
    allocated += amount;
    return {
      day,
      type: 'order_payout',
      amount,
      reference: ORDER_CODES[index % ORDER_CODES.length],
      reference_type: 'order',
    };
  });

  // Place each debit on a day the wallet could actually cover it, moving it
  // later if it could not. Withdrawals are the only ones large enough to
  // matter, and this is what keeps the running balance non-negative.
  const credits = [
    { day: 60, type: 'opening_balance', amount: OPENING, reference: '', reference_type: '' },
    ...payouts,
    ...serviceCredits,
  ];
  const placed = [];
  for (const debit of [...debits].sort((a, b) => b.day - a.day)) {
    let day = debit.day;
    const balanceAt = (on) =>
      credits.filter((entry) => entry.day >= on).reduce((total, entry) => total + entry.amount, 0) -
      placed.filter((entry) => entry.day >= on).reduce((total, entry) => total + entry.amount, 0);
    while (day > 0 && balanceAt(day) < debit.amount) day -= 1;
    placed.push({ ...debit, day });
  }

  const events = [
    ...credits,
    ...placed.map((entry) => ({ ...entry, amount: -entry.amount })),
  ].sort((a, b) => b.day - a.day);

  // Timestamps have to agree with the order the events are in, or two entries
  // on the same day read as though the later one came first — and the running
  // balance beside them then looks wrong even though it is not.
  //
  // `events` runs oldest to newest here (the list is reversed at the end), so
  // within a day each successive entry gets a *later* hour.
  let sameDayRank = 0;
  let previousDay = null;

  let balance = 0;
  const rows = events.map((event, index) => {
    sameDayRank = event.day === previousDay ? sameDayRank + 1 : 0;
    previousDay = event.day;
    balance += event.amount;
    return {
      id: `wl-${index}-${event.reference || 'open'}`,
      date: daysAgo(event.day, Math.min(9 + sameDayRank * 3, 21), (index * 7) % 60),
      type: event.type,
      /** Signed: positive into the wallet, negative out of it. */
      amount: event.amount,
      /** Running balance after this entry. */
      balance,
      reference: event.reference,
      reference_type: event.reference_type,
    };
  });

  // Newest first, the way a ledger is read.
  return rows.reverse();
}

const LEDGER_ROWS = buildLedger();

export const LEDGER = {
  page: 1,
  limit: LEDGER_ROWS.length,
  total: LEDGER_ROWS.length,
  data: LEDGER_ROWS,
};

// ---------------------------------------------------------------------------
// Balances
//
// The pending side is money from orders that are delivered but not yet settled
// by the carrier.
//
// There is deliberately no release schedule here. Telling the merchant when
// each pending amount lands needs the carrier settlement cycle, which the
// backend does not expose — so any date shown would be invented. It is
// recorded in docs/backend-requirements.md instead.
// ---------------------------------------------------------------------------

const PENDING = 81500;

export const BALANCE = {
  currency: 'EGP',
  /** Everything the wallet holds, settled or not. */
  total: PENDING + AVAILABLE,
  /** Delivered but not yet settled — money on the way, not money at risk. */
  pending: PENDING,
  /** Settled and withdrawable today. */
  available: AVAILABLE,
};

// ---------------------------------------------------------------------------
// Withdrawal rules
//
// PROVISIONAL, all of it. These are business rules, so they belong to the
// backend and are read rather than hardcoded in the frontend — otherwise the
// screen and the server can disagree about whether a request is allowed.
// ---------------------------------------------------------------------------

export const WITHDRAWAL_RULES = {
  minimum_amount: 500,
  /** Absent means no ceiling beyond the available balance. */
  maximum_amount: null,
  /** Flat fee per transfer, by method. */
  fees: {
    bank_account: 15,
    vodafone_cash: 10,
    instapay: 0,
    cash: 0,
  },
  /** Whether a second request can be opened while one is still in progress. */
  allow_concurrent_requests: false,
  /** Days of the week transfers go out. 0 is Sunday. */
  transfer_days: [0, 2, 4],
  /** Working days until the money lands, once approved. */
  expected_days: 2,
};

// ---------------------------------------------------------------------------
// Withdrawal requests
// ---------------------------------------------------------------------------

/** The stages a request moves through, in order. */
const STAGES = ['submitted', 'under_review', 'transferring', 'completed'];

function withdrawal(code, amount, methodId, status, day, hour, minute, extra = {}) {
  const method = PAYMENT_METHODS.find((m) => m.id === methodId);
  const fee = WITHDRAWAL_RULES.fees[method.type] ?? 0;
  const reachedIndex = status === 'rejected' ? 1 : STAGES.indexOf(status);
  return {
    id: `wd-${code}`,
    code,
    amount,
    fee,
    /** What actually lands, after the transfer fee. */
    net_amount: amount - fee,
    status,
    method: {
      id: method.id,
      type: method.type,
      label: method.label,
      masked_identifier: method.masked_identifier,
    },
    created_at: daysAgo(day, hour, minute),
    /** One entry per stage reached, so the screen shows progress, not a pill. */
    timeline: STAGES.slice(0, reachedIndex + 1).map((stage, index) => ({
      stage,
      at: daysAgo(day - index, hour, minute),
    })),
    ...extra,
  };
}

const WITHDRAWAL_ROWS = [
  // In progress, which is why a second request cannot be opened.
  withdrawal('110641', 20000, 'pm1', 'transferring', 1, 11, 12, {
    expected_at: daysAhead(1),
  }),
  withdrawal('110500', 38000, 'pm1', 'completed', 10, 17, 21),
  withdrawal('110333', 30000, 'pm1', 'completed', 26, 14, 57),
  withdrawal('110185', 30000, 'pm1', 'completed', 39, 13, 37),
  // PROVISIONAL reason text — the real enum has to come from the backend.
  withdrawal('110102', 12000, 'pm2', 'rejected', 48, 12, 4, {
    rejection_reason: 'رقم المحفظة غير مسجل باسم صاحب الحساب',
  }),
  withdrawal('109958', 16500, 'pm1', 'completed', 55, 16, 27),
];

export const WITHDRAWALS = {
  page: 1,
  limit: WITHDRAWAL_ROWS.length,
  total: WITHDRAWAL_ROWS.length,
  data: WITHDRAWAL_ROWS,
};

/**
 * Why a new request cannot be opened right now, in the server's own words.
 *
 * The old screen said "you can't request a money" and stopped there. A blocked
 * action has to name its reason and, where there is one, the way out — so the
 * reason is a code the UI can translate and act on, never a sentence.
 */
const OPEN_REQUEST = WITHDRAWAL_ROWS.find(
  (row) => row.status !== 'completed' && row.status !== 'rejected'
);

export const WITHDRAWAL_ELIGIBILITY = {
  can_request: !OPEN_REQUEST && AVAILABLE >= WITHDRAWAL_RULES.minimum_amount,
  /** `request_in_progress`, `below_minimum`, `no_payment_method`, or absent. */
  reason: OPEN_REQUEST ? 'request_in_progress' : null,
  /** The figures the reason's message needs, so no number is hardcoded in a string. */
  context: OPEN_REQUEST
    ? { code: OPEN_REQUEST.code, amount: OPEN_REQUEST.amount }
    : { minimum: WITHDRAWAL_RULES.minimum_amount, available: AVAILABLE },
  available: AVAILABLE,
  next_transfer_date: daysAhead(1),
};
