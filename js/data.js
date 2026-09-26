/* TRACE demo dataset — all records are synthetic and fictional. */
window.TRACE_DATA = {
  "caseFile": {
    "id": "TRC-2026-091",
    "name": "Online Payment Fraud Incident",
    "type": "Online Payment Fraud",
    "investigator": "A. Sharma (Demo)",
    "created": "26 Sep 2026",
    "status": "UNDER INVESTIGATION",
    "privacy": "PRIVATE"
  },
  "evidence": [
    {
      "id": "EV-001",
      "fileName": "whatsapp_01.png",
      "kind": "message",
      "label": "Initial KYC message",
      "timestamp": "2026-09-26T10:02:00+05:30",
      "source": "WhatsApp (+91 98200 12345)",
      "eventType": "message_received",
      "description": "Incoming WhatsApp message from an unknown number asking the recipient to complete a \"KYC verification\" step. The message contains no attachment.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-002",
        "EV-003",
        "EV-006"
      ],
      "confidence": 96,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-002",
      "fileName": "whatsapp_02.png",
      "kind": "message",
      "label": "Victim reply",
      "timestamp": "2026-09-26T10:05:00+05:30",
      "source": "WhatsApp (victim device)",
      "eventType": "message_received",
      "description": "Outgoing reply from the victim asking what the KYC verification requires.",
      "phone": "+91 98110 45670",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98110 45670"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-001",
        "EV-003"
      ],
      "confidence": 94,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-003",
      "fileName": "whatsapp_03.png",
      "kind": "message",
      "label": "Sender instructions",
      "timestamp": "2026-09-26T10:09:00+05:30",
      "source": "WhatsApp (+91 98200 12345)",
      "eventType": "message_received",
      "description": "Follow-up message from the same number instructing the victim to open the shared link and enter their UPI ID. Potential inconsistency: the sender claims to represent a verification team but writes from a personal mobile number.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-001",
        "EV-006",
        "EV-041"
      ],
      "confidence": 93,
      "status": "conflict",
      "duplicateGroup": null,
      "conflictIds": [
        "CF-04"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-004",
      "fileName": "whatsapp_04.png",
      "kind": "message",
      "label": "Reference code shared",
      "timestamp": "2026-09-26T10:12:00+05:30",
      "source": "WhatsApp (+91 98200 12345)",
      "eventType": "message_received",
      "description": "The sender shares a reference code \"KYC-2291\" and asks the victim to keep it ready for the next step.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-003",
        "EV-005"
      ],
      "confidence": 91,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-005",
      "fileName": "whatsapp_05.png",
      "kind": "message",
      "label": "Victim acknowledges code",
      "timestamp": "2026-09-26T10:15:00+05:30",
      "source": "WhatsApp (victim device)",
      "eventType": "message_received",
      "description": "Victim confirms receipt of the reference code and asks for the next step.",
      "phone": "+91 98110 45670",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98110 45670"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-004",
        "EV-006"
      ],
      "confidence": 90,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-006",
      "fileName": "shared_link.txt",
      "kind": "url",
      "label": "Suspicious KYC link",
      "timestamp": "2026-09-26T10:18:00+05:30",
      "source": "WhatsApp chat link",
      "eventType": "url_shared",
      "description": "URL shared in the chat: https://kyc-verify-secure.example/verify. The domain is not associated with any verified entity in the available records.",
      "phone": null,
      "email": null,
      "url": "https://kyc-verify-secure.example/verify",
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-003",
        "EV-007",
        "EV-039"
      ],
      "confidence": 97,
      "status": "conflict",
      "duplicateGroup": null,
      "conflictIds": [
        "CF-05"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-007",
      "fileName": "whatsapp_06.png",
      "kind": "message",
      "label": "Victim opens link",
      "timestamp": "2026-09-26T10:22:00+05:30",
      "source": "WhatsApp (victim device)",
      "eventType": "message_received",
      "description": "Victim states they opened the link and entered their UPI ID on the verification page.",
      "phone": "+91 98110 45670",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98110 45670"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-011",
        "EV-013"
      ],
      "confidence": 92,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-008",
      "fileName": "whatsapp_export.txt",
      "kind": "message",
      "label": "Exported chat transcript",
      "timestamp": "2026-09-26T11:45:00+05:30",
      "source": "File import",
      "eventType": "document_imported",
      "description": "Plain-text export of the WhatsApp conversation covering 10:02 AM to 10:22 AM. Possible duplicate of the chat screenshot EV-044.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345",
          "+91 98110 45670"
        ],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-001",
        "EV-003",
        "EV-044"
      ],
      "confidence": 89,
      "status": "needs-review",
      "duplicateGroup": "DG-02",
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-009",
      "fileName": "sms_01.png",
      "kind": "message",
      "label": "Bank debit alert SMS",
      "timestamp": "2026-09-26T10:47:00+05:30",
      "source": "SMS (VM-NOVBNK)",
      "eventType": "message_received",
      "description": "SMS alert stating a debit of ₹5,000 from account XXXXXX4218 with reference TXN-7842.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-026",
        "EV-031"
      ],
      "confidence": 95,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-010",
      "fileName": "whatsapp_07.png",
      "kind": "message",
      "label": "Additional payment request",
      "timestamp": "2026-09-26T11:20:00+05:30",
      "source": "WhatsApp (+91 98200 12345)",
      "eventType": "payment_requested",
      "description": "Message requesting a further payment of ₹7,000 to complete the verification process. Potential fraud indicator: a second payment is requested after the first one completed.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": 7000,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [],
        "amounts": [
          7000
        ],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-005",
        "EV-027",
        "EV-031"
      ],
      "confidence": 90,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-011",
      "fileName": "screenshot_01.png",
      "kind": "screenshot",
      "label": "Chat screenshot (KYC request)",
      "timestamp": "2026-09-26T10:24:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot of the WhatsApp chat showing the initial KYC verification message.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-001",
        "EV-013",
        "EV-044"
      ],
      "confidence": 93,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-012",
      "fileName": "transaction_04.csv",
      "kind": "transaction",
      "label": "Verification transaction record",
      "timestamp": "2026-09-26T10:45:00+05:30",
      "source": "transaction_04.csv (Dataset A)",
      "eventType": "transaction_recorded",
      "description": "CSV row recording a ₹5,000 transaction with ID TXN-7842 at 10:45 AM. Requires investigator review: a second source reports a different amount for the same transaction context.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-027",
        "EV-033",
        "EV-009",
        "EV-026"
      ],
      "confidence": 88,
      "status": "conflict",
      "duplicateGroup": "DG-01",
      "conflictIds": [
        "CF-01",
        "CF-02",
        "CF-03"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-013",
      "fileName": "screenshot_02.png",
      "kind": "screenshot",
      "label": "UPI ID entry screenshot",
      "timestamp": "2026-09-26T10:30:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot showing the UPI ID \"victim2026@novapay\" entered on the verification page.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-007",
        "EV-006",
        "EV-015"
      ],
      "confidence": 91,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-014",
      "fileName": "screenshot_03.png",
      "kind": "screenshot",
      "label": "Verification page screenshot",
      "timestamp": "2026-09-26T10:35:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot of the verification web page after the UPI ID was submitted; the page shows a processing spinner.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-013",
        "EV-015"
      ],
      "confidence": 90,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-015",
      "fileName": "page_url.txt",
      "kind": "url",
      "label": "Verification page URL",
      "timestamp": "2026-09-26T10:38:00+05:30",
      "source": "Browser history",
      "eventType": "url_shared",
      "description": "Recorded destination URL of the verification page: https://kyc-verify-secure.example/verify/submit. Potential fraud indicator: the page is no longer reachable.",
      "phone": null,
      "email": null,
      "url": "https://kyc-verify-secure.example/verify/submit",
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify/submit"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-014"
      ],
      "confidence": 86,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-016",
      "fileName": "txn_log_01.csv",
      "kind": "transaction",
      "label": "Payment initiation record",
      "timestamp": "2026-09-26T10:40:00+05:30",
      "source": "Payment app log",
      "eventType": "transaction_recorded",
      "description": "Log entry showing initiation of a ₹5,000 payment from UPI ID victim2026@novapay.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-017",
        "EV-020"
      ],
      "confidence": 87,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-017",
      "fileName": "txn_log_02.csv",
      "kind": "transaction",
      "label": "Payment authorization record",
      "timestamp": "2026-09-26T10:42:00+05:30",
      "source": "Payment app log",
      "eventType": "transaction_recorded",
      "description": "Log entry recording authorization of the ₹5,000 payment (TXN-7842).",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-016",
        "EV-012"
      ],
      "confidence": 86,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-018",
      "fileName": "kyc_form.pdf",
      "kind": "document",
      "label": "KYC form document",
      "timestamp": "2026-09-26T10:43:00+05:30",
      "source": "Downloaded file",
      "eventType": "document_imported",
      "description": "PDF form titled \"KYC Update Form\" downloaded from the verification page. The document requests personal and banking details.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-015",
        "EV-043"
      ],
      "confidence": 84,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-019",
      "fileName": "whatsapp_14.png",
      "kind": "message",
      "label": "Chat image (timestamp unavailable)",
      "timestamp": null,
      "source": "WhatsApp (+91 98200 12345)",
      "eventType": "message_received",
      "description": "WhatsApp image message; the image metadata contains no timestamp, so it cannot be placed on the timeline. Incomplete record.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-003",
        "EV-008"
      ],
      "confidence": 62,
      "status": "incomplete",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [
        "timestamp"
      ],
      "notes": ""
    },
    {
      "id": "EV-020",
      "fileName": "txn_log_03.csv",
      "kind": "transaction",
      "label": "Payment confirmation record",
      "timestamp": "2026-09-26T10:48:00+05:30",
      "source": "Payment app log",
      "eventType": "transaction_recorded",
      "description": "Log entry confirming completion of the ₹5,000 payment (TXN-7842) at 10:48 AM.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-017",
        "EV-012",
        "EV-009"
      ],
      "confidence": 88,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-021",
      "fileName": "screenshot_04.png",
      "kind": "screenshot",
      "label": "Cropped payment screenshot",
      "timestamp": "2026-09-26T10:50:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot of a payment confirmation; the image is cropped and the amount field is not visible. Incomplete record.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-020",
        "EV-012"
      ],
      "confidence": 64,
      "status": "incomplete",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [
        "amount"
      ],
      "notes": ""
    },
    {
      "id": "EV-022",
      "fileName": "message_21.png",
      "kind": "message",
      "label": "Message with unknown sender",
      "timestamp": "2026-09-26T10:55:00+05:30",
      "source": null,
      "eventType": "message_received",
      "description": "Image of a chat message; sender metadata is missing, so authorship cannot be attributed. Incomplete record.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-008",
        "EV-003"
      ],
      "confidence": 58,
      "status": "incomplete",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [
        "sender"
      ],
      "notes": ""
    },
    {
      "id": "EV-023",
      "fileName": "txn_log_04.csv",
      "kind": "transaction",
      "label": "Second payment attempt record",
      "timestamp": "2026-09-26T10:52:00+05:30",
      "source": "Payment app log",
      "eventType": "transaction_recorded",
      "description": "Log entry for a ₹7,000 payment attempt that did not complete; no matching bank debit was found.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-55201",
      "amount": 7000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          7000
        ],
        "txnIds": [
          "TXN-55201"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-010",
        "EV-017",
        "EV-025"
      ],
      "confidence": 83,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-024",
      "fileName": "txn_log_05.csv",
      "kind": "transaction",
      "label": "Post-debit balance record",
      "timestamp": "2026-09-26T11:05:00+05:30",
      "source": "Payment app log",
      "eventType": "transaction_recorded",
      "description": "Log entry showing the account balance after the ₹5,000 debit (TXN-7842).",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-020",
        "EV-026"
      ],
      "confidence": 85,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-025",
      "fileName": "txn_log_06.csv",
      "kind": "transaction",
      "label": "Refund check record",
      "timestamp": "2026-09-26T11:12:00+05:30",
      "source": "Payment app log",
      "eventType": "transaction_recorded",
      "description": "Log entry noting that no reversal was found for TXN-7842 as of 11:12 AM.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-026"
      ],
      "confidence": 83,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-026",
      "fileName": "bank_entry_nextday.csv",
      "kind": "transaction",
      "label": "Next-day bank posting",
      "timestamp": "2026-09-27T09:12:00+05:30",
      "source": "bank statement",
      "eventType": "transaction_recorded",
      "description": "Bank statement entry posted the next morning confirming the ₹5,000 debit (TXN-7842).",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-032",
        "EV-028"
      ],
      "confidence": 96,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-027",
      "fileName": "screenshot_17.png",
      "kind": "screenshot",
      "label": "Conflicting amount screenshot",
      "timestamp": "2026-09-26T12:05:00+05:30",
      "source": "Second device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot captured at 12:05 PM showing a transaction screen that displays 10:47 AM and ₹7,000 for reference TXN-7842. Requires investigator review: the amount and displayed time differ from the CSV record.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 7000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          7000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-033",
        "EV-010"
      ],
      "confidence": 81,
      "status": "conflict",
      "duplicateGroup": null,
      "conflictIds": [
        "CF-01",
        "CF-03"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-028",
      "fileName": "bank_stmt_01.csv",
      "kind": "transaction",
      "label": "Bank statement debit line",
      "timestamp": "2026-09-26T11:28:00+05:30",
      "source": "bank statement",
      "eventType": "transaction_recorded",
      "description": "Bank statement line recording the ₹5,000 debit with reference TXN-7842.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-026",
        "EV-032",
        "EV-009"
      ],
      "confidence": 94,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-029",
      "fileName": "screenshot_09.png",
      "kind": "screenshot",
      "label": "Truncated link screenshot",
      "timestamp": "2026-09-26T11:15:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot of a chat message containing a truncated link (\"https://kyc-verify…\"). The full destination cannot be verified. Incomplete record.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-039"
      ],
      "confidence": 66,
      "status": "incomplete",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [
        "url"
      ],
      "notes": ""
    },
    {
      "id": "EV-030",
      "fileName": "phishing_email.eml",
      "kind": "email",
      "label": "Phishing email (previous evening)",
      "timestamp": "2026-09-25T21:14:00+05:30",
      "source": "Email inbox",
      "eventType": "email_received",
      "description": "Email received the previous evening with subject \"KYC verification required\", from support@kyc-verify-secure.example. Unverified whether it is connected to the 26 September incident.",
      "phone": null,
      "email": "support@kyc-verify-secure.example",
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": [
          "support@kyc-verify-secure.example"
        ]
      },
      "relatedIds": [
        "EV-006",
        "EV-045"
      ],
      "confidence": 78,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-031",
      "fileName": "bank_stmt_02.csv",
      "kind": "transaction",
      "label": "Alternate reference bank line",
      "timestamp": "2026-09-26T11:32:00+05:30",
      "source": "bank statement",
      "eventType": "transaction_recorded",
      "description": "Bank statement line discovered at 11:32 AM showing a ₹5,000 debit with a different reference, TXN-9130. Requires investigator review: two references appear to describe the same debit.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-9130",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-9130"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-028",
        "EV-009"
      ],
      "confidence": 82,
      "status": "conflict",
      "duplicateGroup": null,
      "conflictIds": [
        "CF-02"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-032",
      "fileName": "bank_stmt_03.csv",
      "kind": "transaction",
      "label": "Bank statement summary line",
      "timestamp": "2026-09-26T11:35:00+05:30",
      "source": "bank statement",
      "eventType": "transaction_recorded",
      "description": "Bank statement summary confirming the ₹5,000 debit (TXN-7842) on 26 September.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-028",
        "EV-026",
        "EV-012"
      ],
      "confidence": 93,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-033",
      "fileName": "screenshot_09b.png",
      "kind": "screenshot",
      "label": "Duplicate transaction screenshot",
      "timestamp": "2026-09-26T11:40:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot of the same ₹5,000 / TXN-7842 transaction confirmation as EV-012. Possible duplicate of the CSV record.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-027",
        "EV-020"
      ],
      "confidence": 90,
      "status": "needs-review",
      "duplicateGroup": "DG-01",
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-034",
      "fileName": "qr_code.png",
      "kind": "image",
      "label": "QR code image",
      "timestamp": "2026-09-26T11:45:00+05:30",
      "source": "WhatsApp chat attachment",
      "eventType": "message_received",
      "description": "Image of a QR code shared in the chat; the encoded destination has not been decoded. Unverified.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-003",
        "EV-006"
      ],
      "confidence": 71,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-035",
      "fileName": "transaction_08.png",
      "kind": "transaction",
      "label": "Bank record image (ID missing)",
      "timestamp": "2026-09-26T11:10:00+05:30",
      "source": "bank statement",
      "eventType": "transaction_recorded",
      "description": "Photograph of a bank record showing a ₹5,000 debit; the transaction ID field is not legible. Incomplete record.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-028",
        "EV-032"
      ],
      "confidence": 63,
      "status": "incomplete",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [
        "transactionId"
      ],
      "notes": ""
    },
    {
      "id": "EV-036",
      "fileName": "sms_03.png",
      "kind": "message",
      "label": "Follow-up SMS alert",
      "timestamp": "2026-09-26T11:02:00+05:30",
      "source": "SMS (VM-NOVBNK)",
      "eventType": "message_received",
      "description": "SMS alert restating the ₹5,000 debit of 10:47 AM.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-009",
        "EV-012"
      ],
      "confidence": 92,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-037",
      "fileName": "sms_04.png",
      "kind": "message",
      "label": "Balance SMS",
      "timestamp": "2026-09-26T11:50:00+05:30",
      "source": "SMS (VM-NOVBNK)",
      "eventType": "message_received",
      "description": "SMS showing the updated account balance after the debit.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-036",
        "EV-026"
      ],
      "confidence": 91,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-038",
      "fileName": "whatsapp_09.png",
      "kind": "message",
      "label": "Victim follow-up question",
      "timestamp": "2026-09-26T11:55:00+05:30",
      "source": "WhatsApp (victim device)",
      "eventType": "message_received",
      "description": "Victim asks why a second payment is needed after the first one completed.",
      "phone": "+91 98110 45670",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98110 45670"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-010",
        "EV-007"
      ],
      "confidence": 89,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-039",
      "fileName": "lookalike_link.txt",
      "kind": "url",
      "label": "Lookalike domain URL",
      "timestamp": "2026-09-26T12:00:00+05:30",
      "source": "Manual review",
      "eventType": "url_shared",
      "description": "Lookalike URL noted during review: https://kycverify-secure.example/verify. Requires investigator review: it closely resembles the link in EV-006 but the domain differs.",
      "phone": null,
      "email": null,
      "url": "https://kycverify-secure.example/verify",
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kycverify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-015",
        "EV-029"
      ],
      "confidence": 85,
      "status": "conflict",
      "duplicateGroup": null,
      "conflictIds": [
        "CF-05"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-040",
      "fileName": "blocked_page.txt",
      "kind": "url",
      "label": "Blocked page record",
      "timestamp": "2026-09-26T12:02:00+05:30",
      "source": "Browser history",
      "eventType": "url_shared",
      "description": "Record of an attempted visit to a verification-related page that failed to load.",
      "phone": null,
      "email": null,
      "url": "https://kyc-verify-secure.example/status",
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/status"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-015",
        "EV-039"
      ],
      "confidence": 80,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-041",
      "fileName": "call_log.csv",
      "kind": "calllog",
      "label": "Call log entry",
      "timestamp": "2026-09-26T12:03:00+05:30",
      "source": "Device call log",
      "eventType": "call_logged",
      "description": "Outgoing call of 2 minutes 14 seconds with +91 99301 77889; the contact is saved under the same name used for the WhatsApp sender. Requires investigator review: the number differs from the WhatsApp number.",
      "phone": "+91 99301 77889",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 99301 77889"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-003",
        "EV-001"
      ],
      "confidence": 87,
      "status": "conflict",
      "duplicateGroup": null,
      "conflictIds": [
        "CF-04"
      ],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-042",
      "fileName": "complaint_notes.pdf",
      "kind": "document",
      "label": "Complaint draft",
      "timestamp": "2026-09-26T11:48:00+05:30",
      "source": "Victim files",
      "eventType": "document_imported",
      "description": "Draft complaint prepared by the victim summarizing the sequence of events on 26 September.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-048",
        "EV-050"
      ],
      "confidence": 88,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-043",
      "fileName": "kyc_terms.pdf",
      "kind": "document",
      "label": "Downloaded terms document",
      "timestamp": "2026-09-26T10:44:00+05:30",
      "source": "Downloaded file",
      "eventType": "document_imported",
      "description": "PDF of terms downloaded from the verification page; the issuer details are unverifiable. Unverified.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://kyc-verify-secure.example/verify"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-018",
        "EV-006"
      ],
      "confidence": 75,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-044",
      "fileName": "chat_screenshot_10.png",
      "kind": "screenshot",
      "label": "Chat screenshot (duplicate)",
      "timestamp": "2026-09-26T11:58:00+05:30",
      "source": "Victim device gallery",
      "eventType": "screenshot_captured",
      "description": "Screenshot of the same WhatsApp conversation captured in EV-008. Possible duplicate of the chat export.",
      "phone": "+91 98200 12345",
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [
          "+91 98200 12345"
        ],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-008",
        "EV-011",
        "EV-001"
      ],
      "confidence": 89,
      "status": "needs-review",
      "duplicateGroup": "DG-02",
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-045",
      "fileName": "bank_alert.eml",
      "kind": "email",
      "label": "Bank alert email",
      "timestamp": "2026-09-26T10:55:00+05:30",
      "source": "Email inbox",
      "eventType": "email_received",
      "description": "Email alert from the bank notification system confirming the ₹5,000 debit (TXN-7842).",
      "phone": null,
      "email": "alerts@novabank-notify.example",
      "url": null,
      "transactionId": "TXN-7842",
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": [
          "alerts@novabank-notify.example"
        ]
      },
      "relatedIds": [
        "EV-009",
        "EV-028",
        "EV-030"
      ],
      "confidence": 93,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-046",
      "fileName": "short_link.txt",
      "kind": "url",
      "label": "Shortened link record",
      "timestamp": "2026-09-26T11:05:00+05:30",
      "source": "Chat metadata",
      "eventType": "url_shared",
      "description": "Shortened link found in chat metadata redirecting toward the verification domain. The final destination is unverified.",
      "phone": null,
      "email": null,
      "url": "https://short.example/k9x2",
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [
          "https://short.example/k9x2"
        ],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-006",
        "EV-015"
      ],
      "confidence": 79,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-047",
      "fileName": "statement_sep.pdf",
      "kind": "document",
      "label": "Account statement PDF",
      "timestamp": "2026-09-26T11:20:00+05:30",
      "source": "bank statement",
      "eventType": "document_imported",
      "description": "PDF account statement for September showing the ₹5,000 debit entry.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": 5000,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-028",
        "EV-032",
        "EV-026"
      ],
      "confidence": 95,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-048",
      "fileName": "incident_summary.pdf",
      "kind": "document",
      "label": "Incident summary",
      "timestamp": "2026-09-26T11:30:00+05:30",
      "source": "Victim files",
      "eventType": "document_imported",
      "description": "One-page summary of the incident timeline prepared for the complaint filing.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-042",
        "EV-050"
      ],
      "confidence": 90,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-049",
      "fileName": "sms_05.png",
      "kind": "message",
      "label": "Unknown SMS",
      "timestamp": "2026-09-26T11:33:00+05:30",
      "source": "SMS (unknown sender)",
      "eventType": "message_received",
      "description": "SMS from an unidentified sender referencing the verification process. The sender could not be matched to other records.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [],
        "txnIds": [],
        "emails": []
      },
      "relatedIds": [
        "EV-036",
        "EV-010"
      ],
      "confidence": 70,
      "status": "needs-review",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    },
    {
      "id": "EV-050",
      "fileName": "investigator_note.txt",
      "kind": "note",
      "label": "Investigator note",
      "timestamp": "2026-09-26T12:04:00+05:30",
      "source": "Investigator notes",
      "eventType": "note_added",
      "description": "Note recording that the ₹5,000 debit is confirmed across multiple sources while the ₹7,000 figure appears in only one screenshot. Requires investigator review.",
      "phone": null,
      "email": null,
      "url": null,
      "transactionId": null,
      "amount": null,
      "currency": "INR",
      "entities": {
        "phones": [],
        "urls": [],
        "amounts": [
          5000,
          7000
        ],
        "txnIds": [
          "TXN-7842"
        ],
        "emails": []
      },
      "relatedIds": [
        "EV-012",
        "EV-027",
        "EV-026"
      ],
      "confidence": 94,
      "status": "verified",
      "duplicateGroup": null,
      "conflictIds": [],
      "missingFields": [],
      "notes": ""
    }
  ],
  "schemaMappings": [
    {
      "dataset": "A",
      "sourceField": "date",
      "traceField": "timestamp",
      "confidence": 88,
      "status": "auto"
    },
    {
      "dataset": "A",
      "sourceField": "time",
      "traceField": "timestamp",
      "confidence": 91,
      "status": "auto"
    },
    {
      "dataset": "A",
      "sourceField": "amount",
      "traceField": "transactionAmount",
      "confidence": 99,
      "status": "auto"
    },
    {
      "dataset": "A",
      "sourceField": "phone",
      "traceField": "phone",
      "confidence": 97,
      "status": "auto"
    },
    {
      "dataset": "A",
      "sourceField": "txn_id",
      "traceField": "transactionId",
      "confidence": 96,
      "status": "auto"
    },
    {
      "dataset": "B",
      "sourceField": "timestamp",
      "traceField": "timestamp",
      "confidence": 99,
      "status": "accepted"
    },
    {
      "dataset": "B",
      "sourceField": "txn_value",
      "traceField": "transactionAmount",
      "confidence": 96,
      "status": "auto"
    },
    {
      "dataset": "B",
      "sourceField": "mobile",
      "traceField": "phone",
      "confidence": 94,
      "status": "auto"
    },
    {
      "dataset": "B",
      "sourceField": "transaction_ref",
      "traceField": "transactionId",
      "confidence": 95,
      "status": "auto"
    },
    {
      "dataset": "C",
      "sourceField": "event_time",
      "traceField": "timestamp",
      "confidence": 90,
      "status": "auto"
    },
    {
      "dataset": "C",
      "sourceField": "payment",
      "traceField": "transactionAmount",
      "confidence": 87,
      "status": "auto"
    },
    {
      "dataset": "C",
      "sourceField": "contact",
      "traceField": "phone",
      "confidence": 89,
      "status": "auto"
    },
    {
      "dataset": "C",
      "sourceField": "reference",
      "traceField": "transactionId",
      "confidence": 86,
      "status": "auto"
    },
    {
      "dataset": "B",
      "sourceField": "payment_link",
      "traceField": "url",
      "confidence": 93,
      "status": "auto"
    },
    {
      "dataset": "A",
      "sourceField": "link",
      "traceField": "url",
      "confidence": 90,
      "status": "auto"
    },
    {
      "dataset": "C",
      "sourceField": "website",
      "traceField": "url",
      "confidence": 84,
      "status": "auto"
    },
    {
      "dataset": "A",
      "sourceField": "url",
      "traceField": "url",
      "confidence": 99,
      "status": "accepted"
    },
    {
      "dataset": "B",
      "sourceField": "txn_ref",
      "traceField": "transactionId",
      "confidence": 92,
      "status": "auto"
    }
  ],
  "contradictions": [
    {
      "id": "CF-01",
      "title": "Conflicting transaction amount",
      "field": "transactionAmount",
      "evidenceA": "EV-012",
      "evidenceB": "EV-027",
      "valueA": "₹5,000",
      "valueB": "₹7,000",
      "reason": "Two evidence sources contain different transaction amounts associated with the same incident context (TXN-7842).",
      "status": "REQUIRES INVESTIGATOR REVIEW"
    },
    {
      "id": "CF-02",
      "title": "Conflicting transaction reference",
      "field": "transactionId",
      "evidenceA": "EV-012",
      "evidenceB": "EV-031",
      "valueA": "TXN-7842",
      "valueB": "TXN-9130",
      "reason": "Two evidence sources associate different transaction references with the same ₹5,000 debit.",
      "status": "REQUIRES INVESTIGATOR REVIEW"
    },
    {
      "id": "CF-03",
      "title": "Conflicting transaction time",
      "field": "timestamp",
      "evidenceA": "EV-012",
      "evidenceB": "EV-027",
      "valueA": "10:45 AM",
      "valueB": "10:47 AM",
      "reason": "The CSV record shows 10:45 AM while the screenshot displays 10:47 AM for the same transaction.",
      "status": "REQUIRES INVESTIGATOR REVIEW"
    },
    {
      "id": "CF-04",
      "title": "Conflicting caller identity",
      "field": "phone",
      "evidenceA": "EV-003",
      "evidenceB": "EV-041",
      "valueA": "+91 98200 12345",
      "valueB": "+91 99301 77889",
      "reason": "The WhatsApp sender number and the call log number are different, yet both are attributed to the same person.",
      "status": "REQUIRES INVESTIGATOR REVIEW"
    },
    {
      "id": "CF-05",
      "title": "Lookalike domain",
      "field": "url",
      "evidenceA": "EV-006",
      "evidenceB": "EV-039",
      "valueA": "https://kyc-verify-secure.example/verify",
      "valueB": "https://kycverify-secure.example/verify",
      "reason": "Two closely resembling domains appear in the evidence; only one was shared in the chat.",
      "status": "REQUIRES INVESTIGATOR REVIEW"
    }
  ],
  "duplicates": [
    {
      "id": "DG-01",
      "evidenceIds": [
        "EV-012",
        "EV-033"
      ],
      "similarity": 98,
      "status": "pending"
    },
    {
      "id": "DG-02",
      "evidenceIds": [
        "EV-008",
        "EV-044"
      ],
      "similarity": 94,
      "status": "pending"
    }
  ],
  "missing": [
    {
      "id": "MS-01",
      "evidenceId": "EV-035",
      "field": "transactionId",
      "label": "Missing transaction ID",
      "why": "Transaction ID is required to link this payment to a bank record.",
      "status": "open"
    },
    {
      "id": "MS-02",
      "evidenceId": "EV-019",
      "field": "timestamp",
      "label": "Missing timestamp",
      "why": "Without a timestamp this message cannot be placed on the timeline.",
      "status": "open"
    },
    {
      "id": "MS-03",
      "evidenceId": "EV-022",
      "field": "sender",
      "label": "Missing sender",
      "why": "Sender identity is needed to attribute this message.",
      "status": "open"
    },
    {
      "id": "MS-04",
      "evidenceId": "EV-029",
      "field": "url",
      "label": "Missing original URL",
      "why": "The shared link is truncated; the full destination cannot be verified.",
      "status": "open"
    },
    {
      "id": "MS-05",
      "evidenceId": "EV-021",
      "field": "amount",
      "label": "Missing amount",
      "why": "The screenshot is cropped; the amount field is not visible.",
      "status": "open"
    }
  ],
  "assumptions": [
    {
      "id": "AS-01",
      "text": "Two records were linked because they reference the same transaction ID TXN-7842.",
      "reason": "Shared transaction identifier",
      "evidenceIds": [
        "EV-012",
        "EV-027",
        "EV-033"
      ],
      "confidence": 92,
      "status": "logged"
    },
    {
      "id": "AS-02",
      "text": "Phone numbers were considered related based on matching country code and final digits.",
      "reason": "Matching country code and trailing digits",
      "evidenceIds": [
        "EV-003",
        "EV-041"
      ],
      "confidence": 68,
      "status": "logged"
    },
    {
      "id": "AS-03",
      "text": "Timestamp was normalized from local time format (26/09/2026 10:45 → ISO).",
      "reason": "Format normalization",
      "evidenceIds": [
        "EV-012"
      ],
      "confidence": 97,
      "status": "logged"
    },
    {
      "id": "AS-04",
      "text": "Two records could not be confidently matched and were left unlinked.",
      "reason": "Insufficient matching attributes",
      "evidenceIds": [
        "EV-036",
        "EV-049"
      ],
      "confidence": 41,
      "status": "logged"
    }
  ],
  "unresolved": [
    {
      "id": "UR-01",
      "text": "Two evidence sources contain different transaction IDs for the same debit.",
      "evidenceIds": [
        "EV-012",
        "EV-031"
      ],
      "status": "Needs human review"
    },
    {
      "id": "UR-02",
      "text": "Sender of message_21.png could not be identified from available metadata.",
      "evidenceIds": [
        "EV-022"
      ],
      "status": "Needs human review"
    }
  ]
};
