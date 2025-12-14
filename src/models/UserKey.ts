import mongoose, { Document, Schema } from "mongoose";

export interface IUserKey extends Document {
  userObjectId: string;
  username: string;
  seed: Buffer;
  microsoftUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserKeySchema = new Schema<IUserKey>(
  {
    username: { type: String, required: true, unique: true, index: true },
    userObjectId: { type: String, required: true, unique: true },
    seed: { type: Buffer, required: true },
    microsoftUser: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const UserKey = mongoose.model<IUserKey>("UserKey", UserKeySchema);
