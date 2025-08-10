# Audion Developer Debug & Testing Guide

## Overview

This guide explains how to use the comprehensive debug and testing infrastructure for Audion's freemium plan system and development workflows.

## Debug System Components

### 1. DebugService (`/services/DebugService.ts`)

Core debug functionality with persistent settings and environment detection.

**Key Features:**
- Password-protected debug mode activation
- Subscription tier forcing for testing
- Feature flag management
- Environment-specific behavior
- Persistent settings via AsyncStorage

**Important Methods:**
```typescript
// Enable debug mode
await DebugService.enableDebugMode(password)

// Check if debug mode is active
DebugService.isDebugModeEnabled()

// Force specific subscription tier
await DebugService.setForcedSubscriptionTier(SubscriptionTier.PREMIUM)

// Bypass subscription limits for testing
await DebugService.toggleBypassSubscriptionLimits()
```

### 2. DebugMenu Component (`/components/DebugMenu.tsx`)

Password-protected UI for accessing all debug features during development and beta testing.

**Access Methods:**
1. **Hidden Trigger**: Tap "About Audion" in Settings 7 times
2. **Developer Options**: Direct access when debug mode is already active
3. **Development Environment**: Automatic access in `__DEV__` mode

### 3. Enhanced SubscriptionService (`/services/SubscriptionService.ts`)

Freemium plan management with debug integration for comprehensive testing.

**Subscription Tiers:**
- **FREE**: 3 max articles, [1, 3] available counts, 1 scheduled content, 5 RSS sources
- **BASIC**: 7 max articles, [1, 3, 5, 7] available counts, 3 scheduled content, 15 RSS sources  
- **PREMIUM**: 15 max articles, [1, 3, 5, 7, 10, 15] available counts, 5 scheduled content, unlimited RSS sources

## Development Workflows

### Testing All Subscription Tiers

1. **Access Debug Menu**:
   - Go to Settings → Tap "About Audion" 7 times
   - Or Settings → Developer Options (if debug mode active)

2. **Force Subscription Tier**:
   ```
   Debug Menu → Subscription Testing → Force [TIER]
   ```

3. **Test Features**:
   - Navigate to Feed & Auto-Pick Settings
   - Test Articles Per Episode functionality
   - Verify schedule content limits
   - Check RSS source limitations

4. **Reset Testing**:
   ```
   Debug Menu → Clear Forced Tier
   ```

### Beta Distribution Testing

1. **Enable Debug Mode for Beta Users**:
   ```typescript
   // In DebugService.ts, update password regularly
   private static readonly DEBUG_PASSWORD = 'audion_beta_2024';
   ```

2. **Provide Beta Instructions**:
   - Send debug password to beta testers
   - Instructions: Settings → About Audion (tap 7 times) → Enter password

3. **Testing Scenarios for Beta Users**:
   - Test each subscription tier thoroughly
   - Verify upgrade prompts work correctly
   - Check feature restrictions are enforced
   - Test subscription tier switching

### Development Environment Setup

1. **Automatic Debug Mode**:
   ```typescript
   // Debug mode automatically enabled in development
   static isDevelopment(): boolean {
     return __DEV__ || process.env.NODE_ENV === 'development';
   }
   ```

2. **Environment Detection**:
   ```typescript
   // Check current environment
   const envInfo = DebugService.getEnvironmentInfo();
   console.log(envInfo);
   ```

## Debug Features Reference

### Subscription Testing
- **Force FREE Tier**: Test basic functionality and upgrade prompts
- **Force BASIC Tier**: Test mid-tier features and limitations  
- **Force PREMIUM Tier**: Test all premium features
- **Clear Forced Tier**: Return to actual subscription state

### Feature Flags
- **Bypass Subscription Limits**: Remove all tier restrictions for testing
- **Show Debug Info**: Display environment and debug state information
- **Enable Beta Features**: Access experimental functionality
- **Mock Premium User**: Simulate premium user without forcing tier
- **Enable Test Alerts**: Show additional debugging alerts

### Development Tools
- **Environment Info**: View current build environment and settings
- **Reset All Settings**: Clear all debug configurations
- **Password Protection**: Secure debug access for production builds

## Best Practices

### For Developers

1. **Regular Testing**:
   - Test each subscription tier during feature development
   - Verify upgrade prompts appear correctly
   - Check feature restrictions work as expected

2. **Debug Password Security**:
   - Update debug password regularly
   - Use different passwords for beta vs internal testing
   - Never commit passwords to version control

3. **Environment-Specific Testing**:
   - Test in development, staging, and production-like environments
   - Verify debug features are properly protected in production builds

### For Beta Testing

1. **Comprehensive Coverage**:
   - Test all subscription tiers
   - Verify upgrade flows work correctly
   - Check feature limitations are enforced

2. **Documentation**:
   - Provide clear instructions to beta testers
   - Document expected behavior for each tier
   - Include troubleshooting steps

## Integration Points

### Settings Integration
- **Developer Options**: Shows current debug state and subscription tier
- **About Section**: Hidden trigger for debug menu access
- **Visual Indicators**: Debug mode status shown in UI

### Subscription-Aware Components
- **Feed & Auto-Pick Settings**: Articles per episode limits
- **Schedule Content Settings**: Scheduled content limitations
- **RSS Sources**: Source count restrictions
- **Manual Pick**: Article count selections

## Troubleshooting

### Common Issues

1. **Debug Menu Not Appearing**:
   - Ensure you're tapping "About Audion" exactly 7 times
   - Check if debug mode is already active via Developer Options
   - Verify you're in the correct Settings screen

2. **Subscription Tier Not Changing**:
   - Confirm debug mode is enabled
   - Check if forced tier is set correctly
   - Navigate away and back to refresh UI state

3. **Features Not Respecting Limits**:
   - Check if "Bypass Subscription Limits" is enabled
   - Verify effective tier is correct
   - Ensure components are using async subscription methods

### Debug Commands

```typescript
// Check current debug state
console.log(await DebugService.loadDebugSettings());

// Check effective subscription tier
console.log(await SubscriptionService.getEffectiveTier());

// Check effective features
console.log(await SubscriptionService.getEffectiveFeatures());

// Reset all debug settings
await DebugService.resetDebugSettings();
```

## Security Considerations

1. **Production Builds**:
   - Debug password protection prevents unauthorized access
   - Environment detection limits debug availability
   - Debug features should not appear in production UI without authentication

2. **Beta Distribution**:
   - Use unique passwords for beta testing
   - Rotate passwords regularly
   - Monitor debug feature usage

3. **Development Builds**:
   - Debug mode automatically available in `__DEV__`
   - Full access to all testing features
   - No password required for internal development

## Next Steps

1. **Integration Complete**: ✅ Debug menu integrated into main settings
2. **Testing Infrastructure**: ✅ Comprehensive freemium testing system
3. **Documentation**: ✅ Developer guide created
4. **Pending**: AI Script Style system integration
5. **Pending**: Custom prompt hand-written input functionality

## Contact

For questions about the debug system or testing workflows, consult this guide or check the implementation in:
- `/services/DebugService.ts`
- `/services/SubscriptionService.ts`
- `/components/DebugMenu.tsx`
- `/app/settings.tsx`