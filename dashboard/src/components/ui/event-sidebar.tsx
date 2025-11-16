import { Sidebar, SidebarContent, SidebarHeader } from './sidebar';

export function EventSidebar() {
  return (
    <Sidebar side="right">
      <SidebarContent>
        <SidebarHeader>
          <h1>Event Sidebar</h1>
        </SidebarHeader>
        <div>
          <h2>Event Details</h2>
          <p>Event Description</p>
          <p>Event Location</p>
          <p>Event Date</p>
          <p>Event Time</p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
