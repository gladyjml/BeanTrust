;; Supply Chain Tracking Contract
;; Clarity v2
;; Tracks coffee batch journey with oracle integration

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-BATCH u101)
(define-constant ERR-INVALID-EVENT u102)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-ORACLE-NOT-TRUSTED u106)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var event-counter uint u0)
(define-map trusted-oracles principal bool)

;; Supply chain events
(define-map batch-events 
  { batch-id: uint, event-id: uint } 
  { 
    event-type: (string-ascii 32),
    timestamp: uint,
    location: (string-ascii 64),
    actor: principal,
    details: (string-ascii 256)
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

;; Private helper: is-trusted-oracle
(define-private (is-trusted-oracle (oracle principal))
  (default-to false (map-get? trusted-oracles oracle))
)

;; Add trusted oracle
(define-public (add-oracle (oracle principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (validate-principal oracle) (err ERR-ZERO-ADDRESS))
    (map-set trusted-oracles oracle true)
    (ok true)
  )
)

;; Remove trusted oracle
(define-public (remove-oracle (oracle principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-delete trusted-oracles oracle)
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

;; Log supply chain event
(define-public (log-event 
  (batch-id uint)
  (event-type (string-ascii 32))
  (location (string-ascii 64))
  (details (string-ascii 256))
)
  (begin
    (ensure-not-paused)
    (asserts! (is-trusted-oracle tx-sender) (err ERR-ORACLE-NOT-TRUSTED))
    (let ((event-id (+ (var-get event-counter) u1)))
      (map-set batch-events 
        { batch-id: batch-id, event-id: event-id }
        { event-type: event-type, timestamp: block-height, location: location, actor: tx-sender, details: details }
      )
      (var-set event-counter event-id)
      (ok event-id)
    )
  )
)

;; Read-only: get event
(define-read-only (get-event (batch-id uint) (event-id uint))
  (match (map-get? batch-events { batch-id: batch-id, event-id: event-id })
    event (ok event)
    (err ERR-INVALID-EVENT)
  )
)

;; Read-only: get event counter
(define-read-only (get-event-counter)
  (ok (var-get event-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: is oracle trusted
(define-read-only (is-oracle-trusted (oracle principal))
  (ok (default-to false (map-get? trusted-oracles oracle)))
)