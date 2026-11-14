import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, size, space, type } from '@/theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Campo de senha com "Mostrar/Ocultar". */
  password?: boolean;
};

// Campo de texto: rótulo em cima, caixa `card` com borda que fica laranja ao digitar, erro em laranja embaixo.
export type TextFieldRef = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextFieldRef, Props>(function TextField(
  { label, error, hint, password = false, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text variant="fieldLabel" color="dim">
        {label}
      </Text>
      <View style={[styles.box, focused && styles.focused, !!error && styles.errorBox]}>
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={password && !visible}
          placeholderTextColor={colors.tabInactive}
          selectionColor={colors.orange}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {password && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={8}
            style={styles.toggle}
          >
            <Text variant="link" color="orange">
              {visible ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text variant="meta" color="orange" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text variant="meta" color="dim">
          {hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.input,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
  },
  focused: {
    borderColor: colors.orange,
  },
  errorBox: {
    borderColor: colors.orangeBorder,
  },
  input: {
    ...type.input,
    flex: 1,
    height: '100%',
    color: colors.ink,
    outlineStyle: 'none',
  } as object,
  toggle: {
    paddingLeft: space.md,
  },
});
