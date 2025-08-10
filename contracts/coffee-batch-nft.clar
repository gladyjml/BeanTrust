;; Coffee Batch NFT Contract
;; Clarity v2
;; Manages NFT minting, transfer, and metadata for coffee batches

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-BATCH u101)
(define-constant ERR-ALREADY-MINTED u102)
(define-constant ERR-NOT-OWNER u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-METADATA-FROZEN u106)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var metadata-frozen bool false)
(define-data-var batch-counter uint u0)

;; NFT data
(define-map batch-ownership { batch-id: uint } { owner: principal })
(define-map batch-metadata 
  { batch-id: uint } 
  { 
    farm-id: (string-ascii 64),
    harvest-date: (string-ascii 10),
    certifications: (list 10 (string-ascii 32)),
    weight: uint,
    variety: (string-ascii 32)
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

;; Freeze metadata
(define-public (freeze-metadata)
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (var-get metadata-frozen)) (err ERR-METADATA-FROZEN))
    (var-set metadata-frozen true)
    (ok true)
  )
)

;; Mint new batch NFT
(define-public (mint-batch 
  (farm-id (string-ascii 64))
  (harvest-date (string-ascii 10))
  (certifications (list 10 (string-ascii 32)))
  (weight uint)
  (variety (string-ascii 32))
)
  (begin
    (ensure-not-paused)
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (let ((batch-id (+ (var-get batch-counter) u1)))
      (asserts! (is-none (map-get? batch-ownership { batch-id: batch-id })) (err ERR-ALREADY-MINTED))
      (map-set batch-ownership { batch-id: batch-id } { owner: tx-sender })
      (map-set batch-metadata 
        { batch-id: batch-id }
        { farm-id: farm-id, harvest-date: harvest-date, certifications: certifications, weight: weight, variety: variety }
      )
      (var-set batch-counter batch-id)
      (ok batch-id)
    )
  )
)

;; Transfer batch NFT
(define-public (transfer-batch (batch-id uint) (recipient principal))
  (begin
    (ensure-not-paused)
    (asserts! (validate-principal recipient) (err ERR-ZERO-ADDRESS))
    (match (map-get? batch-ownership { batch-id: batch-id })
      ownership
      (begin
        (asserts! (is-eq (get owner ownership) tx-sender) (err ERR-NOT-OWNER))
        (map-set batch-ownership { batch-id: batch-id } { owner: recipient })
        (ok true)
      )
      (err ERR-INVALID-BATCH)
    )
  )
)

;; Update batch metadata (before freeze)
(define-public (update-metadata 
  (batch-id uint)
  (farm-id (string-ascii 64))
  (harvest-date (string-ascii 10))
  (certifications (list 10 (string-ascii 32)))
  (weight uint)
  (variety (string-ascii 32))
)
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (var-get metadata-frozen)) (err ERR-METADATA-FROZEN))
    (match (map-get? batch-ownership { batch-id: batch-id })
      ownership
      (begin
        (map-set batch-metadata 
          { batch-id: batch-id }
          { farm-id: farm-id, harvest-date: harvest-date, certifications: certifications, weight: weight, variety: variety }
        )
        (ok true)
      )
      (err ERR-INVALID-BATCH)
    )
  )
)

;; Read-only: get batch owner
(define-read-only (get-batch-owner (batch-id uint))
  (match (map-get? batch-ownership { batch-id: batch-id })
    ownership (ok (get owner ownership))
    (err ERR-INVALID-BATCH)
  )
)

;; Read-only: get batch metadata
(define-read-only (get-batch-metadata (batch-id uint))
  (match (map-get? batch-metadata { batch-id: batch-id })
    metadata (ok metadata)
    (err ERR-INVALID-BATCH)
  )
)

;; Read-only: get batch counter
(define-read-only (get-batch-counter)
  (ok (var-get batch-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: is metadata frozen
(define-read-only (is-metadata-frozen)
  (ok (var-get metadata-frozen))
)