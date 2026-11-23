import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { hasLooseJamo, normalizeName } from '../../common/utils/name';

const NAME_MAX = 10;

/**
 * 참여자 이름 규칙 (스펙 3.3): 한글(완성형)·영문·숫자, 공백 없이 1~10글자, 자음·모음 따로 금지.
 * 글자 종류는 common/utils/name.ts의 함수로 판단한다 (비교용 이름에서 지워지는 글자가 없어야 함).
 */
@ValidatorConstraint({ name: 'jamParticipantName' })
class JamParticipantNameRule implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const nfc = value.normalize('NFC');
    return (
      !hasLooseJamo(nfc) &&
      nfc.length >= 1 &&
      nfc.length <= NAME_MAX &&
      normalizeName(nfc).length === nfc.length
    );
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value === 'string' && hasLooseJamo(args.value)) {
      return '한글 자음·모음만 따로 쓴 이름은 쓸 수 없어요';
    }
    return '이름은 한글, 영문, 숫자로 띄어쓰기 없이 1~10글자예요';
  }
}

export class EnterDto {
  @ApiProperty({
    description: '이름 (한글·영문·숫자 1~10글자)',
    example: '김도윤',
  })
  @IsString({ message: '이름은 한글, 영문, 숫자로 띄어쓰기 없이 1~10글자예요' })
  @Validate(JamParticipantNameRule)
  name!: string;

  @ApiProperty({ description: '비밀번호 (숫자 4자리)', example: '1234' })
  @IsString({ message: '비밀번호는 숫자 4자리예요' })
  @Matches(/^[0-9]{4}$/, { message: '비밀번호는 숫자 4자리예요' })
  pin!: string;
}
