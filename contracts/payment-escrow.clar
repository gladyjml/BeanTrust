;; Payment Escrow Contract
;; Clarity v2
;; Manages tokenized payments with dispute resolution

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-ESCROW u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-NOT-ARBITER u106)
(define-constant ERR-ESCROW-NOT-ACTIVE u107)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var escrow-counter uint u0)
(define-map trusted-arbiters principal bool)

;; Escrow data
(define-map escrows 
  { escrow-id: uint } 
  { 
    batch-id: uint,
    buyer: principal,
    seller: principal,
    amount: uint,
    status: (string-ascii 32),
    arbiter: (optional principal)
  }
)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate principal
(define-private (validate-principal (account principal))
  (not (is-eq account 'SP000000000000000000002Q6VF78))
)

;; Private helper: is-trusted-arbiter
(define-private (is-trusted-arbiter (arbiter principal))
  (default-to false (map-get? trusted-arbiters arbiter))
)

;; Add trusted arbiter
(define-public (add-arbiter (arbiter principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (validate-principal arbiter) (err ERR-ZERO-ADDRESS))
    (map-set trusted-arbiters arbiter true)
    (ok true)
  )
)

;; Remove trusted arbiter
(define-public (remove-arbiter (arbiter principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-delete trusted-arbiters arbiter)
    (ok true)
  )
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (validate-principal new-admin) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Create escrow
(define-public (create-escrow (batch-id uint) (seller principal) (amount uint) (arbiter (optional principal)))
  (begin
    (ensure-not-paused)
    (asserts! (validate-principal seller) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (match arbiter
      arbiter-principal (asserts! (is-trusted-arbiter arbiter-principal) (err ERR-NOT-ARBITER))
      true
    )
    (let ((escrow-id (+ (var-get escrow-counter) u1)))
      (try! (contract-call? .fairtrade-token transfer-from tx-sender (as-contract tx-sender) amount))
      (map-set escrows 
        { escrow-id: escrow-id }
        { batch-id: batch-id, buyer: tx-sender, seller: seller, amount: amount, status: "active", arbiter: arbiter }
      )
      (var-set escrow-counter escrow-id)
      (ok escrow-id)
    )
  )
)

;; Release escrow
(define-public (release-escrow (escrow-id uint))
  (begin
    (ensure-not-paused)
    (match (map-get? escrows { escrow-id: escrow-id })
      escrow
      (begin
        (asserts! (is-eq (get status escrow) "active") (err ERR-ESCROW-NOT-ACTIVE))
        (asserts! (is-eq tx-sender (get buyer escrow)) (err ERR-NOT-AUTHORIZED))
        (try! (as-contract (contract-call? .fairtrade-token transfer (get seller escrow) (get amount escrow))))
        (map-set escrows { escrow-id: escrow-id } (merge escrow { status: "released" }))
        (ok true)
      )
      (err ERR-INVALID-ESCROW)
    )
  )
)

;; Dispute escrow
(define-public (dispute-escrow (escrow-id uint))
  (begin
    (ensure-not-paused)
    (match (map-get? escrows { escrow-id: escrow-id })
      escrow
      (begin
        (asserts! (or (is-eq tx-sender (get buyer escrow)) (is-eq tx-sender (get seller escrow))) (err ERR-NOT-AUTHORIZED))
        (asserts! (is-eq (get status escrow) "active") (err ERR-ESCROW-NOT-ACTIVE))
        (map-set escrows { escrow-id: escrow-id } (merge escrow { status: "disputed" }))
        (ok true)
      )
      (err ERR-INVALID-ESCROW)
    )
  )
)

;; Resolve dispute
(define-public (resolve-dispute (escrow-id uint) (release-to-seller bool))
  (begin
    (ensure-not-paused)
    (match (map-get? escrows { escrow-id: escrow-id })
      escrow
      (begin
        (asserts! (is-eq (get status escrow) "disputed") (err ERR-ESCROW-NOT-ACTIVE))
        (asserts! (is-some (get arbiter escrow)) (err ERR-NOT-ARBITER))
        (asserts! (is-eq tx-sender (unwrap! (get arbiter escrow) (err ERR-NOT-ARBITER))) (err ERR-NOT-ARBITER))
        (let ((recipient (if release-to-seller (get seller escrow) (get buyer escrow))))
          (try! (as-contract (contract-call? .fairtrade-token transfer recipient (get amount escrow))))
          (map-set escrows { escrow-id: escrow-id } (merge escrow { status: (if release-to-seller "released" "refunded") }))
          (ok true)
        )
      )
      (err ERR-INVALID-ESCROW)
    )
  )
)

;; Read-only: get escrow
(define-read-only (get-escrow (escrow-id uint))
  (match (map-get? escrows { escrow-id: escrow-id })
    escrow (ok escrow)
    (err ERR-INVALID-ESCROW)
  )
)

;; Read-only: get escrow counter
(define-read-only (get-escrow-counter)
  (ok (var-get escrow-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: is arbiter trusted
(define-read-only (is-arbiter-trusted (arbiter principal))
  (ok (default-to false (map-get? trusted-arbiters arbiter)))
)