import { useCanAccess } from '@/app/features/auth/hooks';
import CompanySettings from '../organisms/company-setting';
import MenuVisibilitySettings from '../organisms/menu-visibility';
import ProfileSettings from '../organisms/profile-setting';
import TabBar, { TabsContent } from '../organisms/tab-bar';

function SettingTemplate() {
  const { canAccess: canManageCompany } = useCanAccess('company_settings');

  const { canAccess: canManageMenuVisibility } =
    useCanAccess('menu_visibility');

  const menuItems = [
    {
      name: 'Profile',
      value: 'profile',
    },
    ...(canManageCompany
      ? [
          {
            name: 'Company',
            value: 'company',
          },
        ]
      : []),
    ...(canManageMenuVisibility
      ? [
          {
            name: 'Menu Visibility',
            value: 'menu-visibility',
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences and system configuration
        </p>
      </div>

      <TabBar items={menuItems}>
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        {canManageCompany && (
          <TabsContent value="company">
            <CompanySettings />
          </TabsContent>
        )}

        {canManageMenuVisibility && (
          <TabsContent value="menu-visibility">
            <MenuVisibilitySettings />
          </TabsContent>
        )}
      </TabBar>
    </div>
  );
}

export default SettingTemplate;
