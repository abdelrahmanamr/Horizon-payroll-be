interface FirestoreEncryptedItem {
  mapValue: {
    fields: {
      iv?: { stringValue: string };
      tag?: { stringValue: string };
      ciphertext?: { stringValue: string };
    };
  };
}

interface FirestoreResponse {
  fields: {
    encrypted: {
      arrayValue: {
        values: FirestoreEncryptedItem[];
      };
    };
  };
}

export function mapFirestoreEncryptedData(data: FirestoreResponse) {
  const encryptedArray = data.fields.encrypted.arrayValue.values.map((item) => {
    const fields = item.mapValue.fields;

    return {
      iv: fields.iv?.stringValue || "",
      tag: fields.tag?.stringValue || "",
      ciphertext: fields.ciphertext?.stringValue || "",
    };
  });

  return {
    encrypted: encryptedArray,
  };
}
