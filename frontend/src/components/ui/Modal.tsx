import { Modal as RNModal, View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { colors, radius, spacing } from '../../utils/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal = ({ visible, onClose, children }: ModalProps) => (
  <RNModal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
    // VoiceOver/TalkBack need this to stop treating whatever's behind the
    // modal as still reachable — without it, swiping past the dialog's
    // content can land back on the screen underneath.
    accessibilityViewIsModal
  >
    {/* accessible={false}: this wraps the whole dialog including its
        content — giving it its own label/role would collapse everything
        inside into one opaque node, hiding the dialog's real content from
        screen readers. Backdrop-tap-to-dismiss stays a sighted-only
        affordance; VoiceOver/TalkBack users dismiss via the OS back
        gesture, which onRequestClose already handles. */}
    <TouchableWithoutFeedback onPress={onClose} accessible={false}>
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback accessible={false}>
          <View style={styles.content}>{children}</View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </RNModal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
