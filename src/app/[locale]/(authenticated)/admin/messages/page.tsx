/**
 * Admin Message Moderation Page
 * Allows admins to view, moderate, and manage all messages
 */

import { MessageModerationPanel } from './_components/message-moderation-panel';

export const metadata = {
  title: 'Message Moderation | Admin',
  description: 'Moderate and manage messaging system',
};

export default function AdminMessagesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Message Moderation</h1>
        <p className="text-muted-foreground mt-2">
          View, moderate, and manage messages across the platform
        </p>
      </div>

      <MessageModerationPanel />
    </div>
  );
}
